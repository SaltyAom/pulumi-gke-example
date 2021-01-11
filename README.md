## Note: Archive
I have just getting started with Kubernetes and have no real-experience using Kubernetes on production.
This is like a script I wrote to experiment with [GKE](https://cloud.google.com/kubernetes-engine) and [Pulumi](https://www.pulumi.com). Proceed with caution.

# Pulumi GKE Example
This script automate deployment of Kubernete to Google Kubernetes Engine using [maidreamin-api-graphql](https://github.com/SaltyAom/maidreamin-api-graphql) image.

## Prequisted
- [Node.js](https://nodejs.org)
- [Docker](https://www.docker.com)
- [Kubernetes](https://kubernetes.io)
- [Helm](https://helm.sh)
- [Pulumi CLI](https://www.pulumi.com)
- [Google Cloud SDK](https://cloud.google.com/sdk)
- [GCP Account](https://cloud.google.com)

## Getting started
1. Install dependencies
```bash
yarn
```

2. Set Google Cloud config for deplying:
```bash
pulumi config set gcp:project <project-name>
pulumi config set gcp:zone <gcp-zone>
pulumi config set gcp:region <gcp-region>
```

3. Use your own docker image in `index.ts`:
```bash
108 {
109   name,
110   image: <your-own-image> <-- Edit here
111   ports: [{ name: 'http', containerPort: 8080 }]
112 }
```

4. Deploys with Pulumi
```bash
pulumi up
```

5. If deployment is success, you'll get outputs like this:
```bash
Outputs:
    clusterName    : "dreamin-k8s-7a2dded"
    deploymentName : "dreamin-k8s-tgg90ye4"
    ingressPublicIP: "104.199.188.0"
    kubeconfig     : "[secret]"
    namespaceName  : "dreamin-k8s-fbv6phfc"
    serviceName    : "dreamin-k8s-4xugx232"
    servicePublicIP: "35.194.165.35"
```
You can access your deployment using `ingressPublicIP`, which in this case is [`104.199.188.0`](http://104.199.188.0).

## Reference
For reference please refer to:
- [Pulumi GKE](https://www.pulumi.com/docs/tutorials/kubernetes/gke/)
- [Pulumi k8s](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/)
- [Pulumi k8s api documentation](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/kubernetes/)
- [Pulumi gke api documentation](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/spotinst/gke/)
- [nginx-ingress](https://kubernetes.github.io/ingress-nginx/)