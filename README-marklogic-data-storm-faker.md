# MarkLogic Data Storm - k6 Load Test with Faker.js

A k6 load testing script for MarkLogic that uses [@faker-js/faker](https://fakerjs.dev/) to generate realistic random documents with multiple document types.

## Features

- **Multiple Document Types**: Generate 9 different document types (standard, minimal, extended, financial, ecommerce, healthcare, iot, social, log)
- **Mixed Document Generation**: Randomly select from multiple document types per batch
- **Variable Batch Sizes**: Support for random batch sizes within a configurable range
- **Burst/Ramping Load**: Configure load to increase every interval (e.g., every 1 minute)
- **Full MarkLogic REST API Support**: Basic and Digest authentication, TLS/SSL, REST transforms
- **Prometheus Integration**: Export metrics to Prometheus for Grafana dashboards

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed
- Access to a MarkLogic server
- (Optional) k6-operator for Kubernetes deployments

## Quick Start

### Local Execution

```bash
# Basic run with defaults
k6 run marklogic-data-storm-faker.js

# With environment variables
k6 run \
  -e HOST=marklogic.example.com \
  -e PORT=8000 \
  -e USERNAME=admin \
  -e PASSWORD=admin \
  -e DATABASE=Documents \
  -e DOC_TYPE=ecommerce \
  -e BATCH_SIZE=100 \
  -e DURATION=5m \
  marklogic-data-storm-faker.js
```

### Kubernetes (k6-operator)

1. Create a ConfigMap with the script:
```bash
kubectl create configmap marklogic-data-storm-faker-script \
  --from-file=marklogic-data-storm-faker.js \
  -n ml
```

2. Apply the TestRun manifest (see example below)

## Environment Variables

### Connection Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `ml-k6.ml-kube.com` | MarkLogic server hostname |
| `PORT` | `443` | Server port |
| `SSL` | `true` | Use HTTPS. Set to `false` for HTTP |
| `DATABASE` | `Documents` | Target database name |
| `BASE_PATH` | `/console` | URL path prefix (for load balancers) |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `USERNAME` | `GeoAB` | MarkLogic username |
| `PASSWORD` | `X0FlWXIbvy` | MarkLogic password |
| `AUTH_TYPE` | `basic` | Authentication type: `basic` or `digest` |

### TLS Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `INSECURE_SKIP_TLS_VERIFY` | `false` | Skip TLS certificate verification |

### Document Generation

| Variable | Default | Description |
|----------|---------|-------------|
| `DOC_TYPE` | `standard` | Document type(s) - comma-separated for multiple |
| `INCLUDE_DOC_METADATA` | `false` | Add `_metadata` field with doc type info |
| `BATCH_SIZE` | `100` | Fixed batch size per iteration |
| `BATCH_SIZE_MIN` | (uses BATCH_SIZE) | Minimum batch size for random range |
| `BATCH_SIZE_MAX` | (uses BATCH_SIZE) | Maximum batch size for random range |
| `REST_TRANSFORM` | `` | Optional MarkLogic REST transform name |

### Load Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `THREAD_COUNT` | `20` | Number of virtual users (VUs) |
| `DURATION` | `5m` | Test duration |
| `THINK_TIME` | `0.1` | Sleep time between iterations (seconds) |

### Burst/Ramping Configuration

| Variable | Description |
|----------|-------------|
| `K6_STAGES` | Explicit stages: `1m:100,1m:200,1m:300` |
| `RAMP_UP_INTERVAL` | Time between VU increases: `1m` |
| `VU_INCREMENT` | VUs to add each interval: `100` |
| `MAX_VUS` | Maximum VUs to reach: `500` |
| `START_VUS` | Starting VUs (default: `0`) |

## Document Types

### `standard` (default)
Basic person information - name, email, phone, address.

```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@example.com",
  "ip_address": "192.168.1.1",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "United States",
  "phone_number": "555-123-4567",
  "timestamp": "2025-12-18T10:30:00.000Z"
}
```

### `minimal`
Smallest document for high-throughput testing.

```json
{
  "id": "uuid",
  "name": "John Smith",
  "email": "john@example.com",
  "timestamp": "2025-12-18T10:30:00.000Z"
}
```

### `extended`
Full user profile with nested address, phone, and company info.

### `financial`
Transaction records with account, card, merchant details.

### `ecommerce`
Order documents with items array, shipping, payment info.

### `healthcare`
Patient records with vitals, insurance, visit details.

### `iot`
IoT sensor readings with device info and location.

### `social`
Social media posts with engagement metrics.

### `log`
Application log events with context, HTTP info, stack traces.

## Usage Examples

### Single Document Type

```bash
k6 run -e DOC_TYPE=financial marklogic-data-storm-faker.js
```

### Multiple Document Types (Random Selection)

```bash
k6 run -e DOC_TYPE="standard,financial,ecommerce,healthcare" marklogic-data-storm-faker.js
```

### Variable Batch Size

```bash
k6 run \
  -e BATCH_SIZE_MIN=50 \
  -e BATCH_SIZE_MAX=200 \
  marklogic-data-storm-faker.js
```

### Burst Load (Increase Every Minute)

```bash
# Using explicit stages
k6 run -e K6_STAGES="1m:100,1m:200,1m:300,1m:400,1m:500" marklogic-data-storm-faker.js

# Using auto-generated ramping
k6 run \
  -e RAMP_UP_INTERVAL=1m \
  -e VU_INCREMENT=100 \
  -e MAX_VUS=500 \
  marklogic-data-storm-faker.js
```

### With Document Metadata

```bash
k6 run \
  -e DOC_TYPE="financial,ecommerce,log" \
  -e INCLUDE_DOC_METADATA=true \
  marklogic-data-storm-faker.js
```

Output documents will include:
```json
{
  "...document fields...",
  "_metadata": {
    "doc_type": "financial",
    "generated_at": "2025-12-18T10:30:00.000Z",
    "generator": "k6-faker"
  }
}
```

## Kubernetes TestRun Example

```yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: marklogic-faker-test
  namespace: ml
spec:
  parallelism: 10
  script:
    configMap:
      name: marklogic-data-storm-faker-script
      file: marklogic-data-storm-faker.js
  runner:
    image: grafana/k6:latest
    env:
      # Prometheus metrics export
      - name: K6_OUT
        value: "experimental-prometheus-rw"
      - name: K6_PROMETHEUS_RW_SERVER_URL
        value: "http://prometheus:9090/api/v1/write"
      
      # MarkLogic connection
      - name: HOST
        value: "dnode-0.dnode.ml.svc.cluster.local"
      - name: PORT
        value: "8000"
      - name: SSL
        value: "false"
      - name: DATABASE
        value: "Documents"
      - name: USERNAME
        value: "admin"
      - name: PASSWORD
        value: "admin"
      - name: AUTH_TYPE
        value: "basic"
      
      # Document generation
      - name: DOC_TYPE
        value: "standard,financial,ecommerce,healthcare"
      - name: INCLUDE_DOC_METADATA
        value: "true"
      - name: BATCH_SIZE_MIN
        value: "50"
      - name: BATCH_SIZE_MAX
        value: "150"
      
      # Burst configuration - increase every 1 minute
      - name: K6_STAGES
        value: "1m:100,1m:200,1m:300,1m:400,1m:500"
      - name: THINK_TIME
        value: "0.05"
    
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  
  cleanup: "post"
```

## Metrics

The script exports the following custom metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `documents_written` | Counter | Total documents successfully written |
| `write_errors` | Rate | Error rate for write operations |
| `write_duration` | Trend | Time to complete batch writes |
| `document_size_bytes` | Trend | Size of generated documents |
| `total_bytes_written` | Counter | Total bytes written to MarkLogic |
| `batch_processing_time` | Trend | Time to process each batch |
| `batch_success_rate` | Rate | Rate of fully successful batches |
| `documents_per_second` | Trend | Throughput metric |
| `http_4xx_errors` | Counter | Client error count |
| `http_5xx_errors` | Counter | Server error count |
| `timeout_errors` | Counter | Timeout error count |

## Thresholds

Default thresholds (configurable in script):

- `http_req_failed`: < 1% error rate
- `http_req_duration`: 95th percentile < 3000ms
- `documents_written`: At least some documents written
- `write_errors`: < 1% write error rate

## Troubleshooting

### Authentication Errors (401)

- Verify `USERNAME` and `PASSWORD`
- Try switching `AUTH_TYPE` between `basic` and `digest`
- Check MarkLogic user has write permissions to the database

### TLS/Certificate Errors

- Set `INSECURE_SKIP_TLS_VERIFY=true` for self-signed certificates
- Ensure `SSL=true` when connecting to HTTPS endpoints

### Connection Timeouts

- Verify `HOST` and `PORT` are correct
- Check network connectivity to MarkLogic
- Ensure `BASE_PATH` matches your load balancer configuration

### No Documents Written

- Check MarkLogic server logs for errors
- Verify database name in `DATABASE` variable
- Ensure user has document write permissions

## License

MIT
