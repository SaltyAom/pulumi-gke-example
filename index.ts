import * as k8s from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

const name = 'dreamin-k8s'

// Create a GKE cluster
const engineVersion = gcp.container
    .getEngineVersions()
    .then((v) => v.latestMasterVersion)

const cluster = new gcp.container.Cluster(name, {
    initialNodeCount: 1,
    minMasterVersion: engineVersion,
    nodeVersion: engineVersion,
    enableShieldedNodes: true,
    location: gcp.config.region,
    clusterAutoscaling: {
        enabled: true,
        resourceLimits: [
            {
                resourceType: 'cpu',
                minimum: 1,
                maximum: 2
            },
            {
                resourceType: 'memory',
                minimum: .5,
                maximum: 1
            }
        ]
    },
    nodeConfig: {
        machineType: 'e2-medium',
        oauthScopes: [
            'https://www.googleapis.com/auth/compute',
            'https://www.googleapis.com/auth/devstorage.read_only',
            'https://www.googleapis.com/auth/logging.write',
            'https://www.googleapis.com/auth/monitoring'
        ]
    }
})

// Export the Cluster name
export const clusterName = cluster.name

// Manufacture a GKE-style kubeconfig. Note that this is slightly "different"
// because of the way GKE requires gcloud to be in the picture for cluster
// authentication (rather than using the client cert/key directly).
export const kubeconfig = pulumi
    .all([cluster.name, cluster.endpoint, cluster.masterAuth])
    .apply(([name, endpoint, masterAuth]) => {
        const context = `${gcp.config.project}_${gcp.config.zone}_${name}`
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`
    })

// Create a Kubernetes provider instance that uses our cluster from above.
const clusterProvider = new k8s.Provider(name, {
    kubeconfig: kubeconfig
})

const ns = new k8s.core.v1.Namespace(name, {}, { provider: clusterProvider })

export const namespaceName = ns.metadata.apply((m) => m.name)

const appLabels = { appClass: name }

const deployment = new k8s.apps.v1.Deployment(
    name,
    {
        metadata: {
            namespace: namespaceName,
            labels: appLabels
        },
        spec: {
            replicas: 4,
            selector: { matchLabels: appLabels },
            template: {
                metadata: {
                    labels: appLabels
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image:
                                'asia.gcr.io/saltyaom-casual/dreamin-graphql:latest',
                            ports: [{ name: 'http', containerPort: 8080 }]
                        }
                    ]
                }
            }
        }
    },
    {
        provider: clusterProvider
    }
)

// Export the Deployment name
export const deploymentName = deployment.metadata.apply((m) => m.name)

// Create a LoadBalancer Service for the NGINX Deployment
const service = new k8s.core.v1.Service(
    name,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
            annotations: { 'cloud.google.com/neg': '{"ingress": true}' }
        },
        spec: {
            type: 'LoadBalancer',
            ports: [{ port: 8080, protocol: 'TCP' }],
            publishNotReadyAddresses: true,
            selector: appLabels
        }
    },
    {
        provider: clusterProvider
    }
)

export const serviceName = service.metadata.apply((m) => m.name)

// Deploy the NGINX ingress controller using the Helm chart.
const nginx = new k8s.helm.v3.Chart(
    'nginx',
    {
        namespace: namespaceName,
        chart: 'nginx-ingress',
        version: '1.24.4',
        repo: 'stable',
        values: { controller: { publishService: { enabled: true } } },
        transformations: [
            (obj: any) => {
                if (obj.metadata) {
                    obj.metadata.namespace = namespaceName
                }
            }
        ]
    },
    { provider: clusterProvider }
)

const ingress = new k8s.extensions.v1beta1.Ingress(
    name,
    {
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
            annotations: { 'kubernetes.io/ingress.class': 'nginx' }
        },
        spec: {
            rules: [
                {
                    http: {
                        paths: [
                            {
                                path: '/',
                                backend: {
                                    serviceName,
                                    servicePort: 8080
                                }
                            }
                        ]
                    }
                }
            ]
        }
    },
    { provider: clusterProvider }
)

// Export the Service name and public LoadBalancer endpoint
export const servicePublicIP = service.status.apply(
    (s) => s.loadBalancer.ingress[0].ip
)

export const ingressPublicIP = ingress.status.apply(
    (s) => s.loadBalancer.ingress[0].ip
)
