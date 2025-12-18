# MarkLogic Data Storm - k6 Load Test

This k6 test replicates the behavior of the marklogic-data-storm Node.js application for load testing MarkLogic databases.

## Features

- **Bulk document writes** - Mimics the batch writing behavior of RESTWriter
- **Random data generation** - Generates fake data similar to the original application
- **Configurable concurrency** - Uses VUs to simulate thread count
- **Authentication support** - Both Basic and Digest authentication
- **HTTPS support** - TLS/SSL with certificate verification control
- **Custom metrics** - Tracks documents written, error rates, and durations
- **REST transforms** - Optional MarkLogic content transforms

## Configuration

All configuration is done via environment variables (equivalent to .properties file):

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `HOST` | `localhost` | MarkLogic host |
| `PORT` | `8000` | MarkLogic port |
| `SSL` | `false` | Enable HTTPS (`true`/`false`) |
| `DATABASE` | `Documents` | Target database |
| `USERNAME` | `admin` | Authentication username |
| `PASSWORD` | `admin` | Authentication password |
| `AUTH_TYPE` | `digest` | Authentication type (`basic` or `digest`) |
| `BASE_PATH` | `` | Base path for load balancers |
| `BATCH_SIZE` | `100` | Documents per batch write |
| `THREAD_COUNT` | `8` | Number of concurrent virtual users |
| `DURATION` | `5m` | Test duration |
| `REST_TRANSFORM` | `` | Optional MarkLogic transform name |
| `INSECURE_SKIP_TLS_VERIFY` | `false` | Skip TLS certificate verification |
| `VERIFY_WRITES` | `false` | Verify documents after write |
| `THINK_TIME` | `0.1` | Delay between iterations (seconds) |

## Usage Examples

### Basic Load Test (HTTP with Digest Auth)
```bash
k6 run marklogic-data-storm.js
```

### HTTPS with Self-Signed Certificate
```bash
k6 run \
  -e HOST=marklogic.example.com \
  -e PORT=8443 \
  -e SSL=true \
  -e INSECURE_SKIP_TLS_VERIFY=true \
  marklogic-data-storm.js
```

### High-Throughput Test (Large Batches)
```bash
k6 run \
  -e BATCH_SIZE=500 \
  -e THREAD_COUNT=20 \
  -e DURATION=10m \
  marklogic-data-storm.js
```

### Basic Authentication
```bash
k6 run \
  -e AUTH_TYPE=basic \
  -e USERNAME=myuser \
  -e PASSWORD=mypass \
  marklogic-data-storm.js
```

### With Load Balancer and Base Path
```bash
k6 run \
  -e HOST=lb.example.com \
  -e PORT=443 \
  -e SSL=true \
  -e BASE_PATH=/marklogic-api \
  marklogic-data-storm.js
```

### With REST Transform
```bash
k6 run \
  -e REST_TRANSFORM=my-transform \
  -e DATABASE=MyDatabase \
  marklogic-data-storm.js
```

### Kubernetes/OpenShift (via k6 Operator)
```bash
k6 run \
  -e HOST=ml12-cluster.ml.svc.cluster.local \
  -e PORT=8000 \
  -e DATABASE=Documents \
  marklogic-data-storm.js
```

## Output Metrics

The test tracks custom metrics specific to MarkLogic data loading:

- **documents_written** - Total number of documents successfully written
- **write_errors** - Rate of failed write operations
- **write_duration** - Duration of bulk write operations

## Comparison with marklogic-data-storm

| Feature | marklogic-data-storm (Node.js) | k6 Test |
|---------|--------------------------------|---------|
| Batch Writing | ✅ `batchSize` | ✅ `BATCH_SIZE` |
| Concurrency | ✅ `threadCount` | ✅ `THREAD_COUNT` (VUs) |
| Authentication | ✅ Basic/Digest | ✅ Basic/Digest |
| HTTPS/SSL | ✅ `ssl`, `rejectUnauthorized` | ✅ `SSL`, `INSECURE_SKIP_TLS_VERIFY` |
| Base Path | ✅ `basePath` | ✅ `BASE_PATH` |
| REST Transform | ✅ `rest.transform` | ✅ `REST_TRANSFORM` |
| Random Data | ✅ Faker.js | ✅ Native JS |
| CSV Loading | ✅ | ❌ Not applicable for k6 |
| Queue Management | ✅ `queueSize` | ✅ Built into k6 |

## Running from Argo Workflows

See [argo-marklogic-load-test.yaml](argo-marklogic-load-test.yaml) for Kubernetes-based execution.

## Performance Tuning

**For maximum throughput:**
```bash
k6 run \
  -e BATCH_SIZE=1000 \
  -e THREAD_COUNT=50 \
  -e THINK_TIME=0 \
  -e DURATION=30m \
  marklogic-data-storm.js
```

**For sustained load testing:**
```bash
k6 run \
  -e BATCH_SIZE=100 \
  -e THREAD_COUNT=10 \
  -e THINK_TIME=1 \
  -e DURATION=2h \
  marklogic-data-storm.js
```

**For stress testing:**
```bash
k6 run \
  -e BATCH_SIZE=500 \
  -e THREAD_COUNT=100 \
  -e DURATION=15m \
  marklogic-data-storm.js
```

## Troubleshooting

**401 Unauthorized:**
- Check `AUTH_TYPE` matches your MarkLogic app server configuration
- Verify `USERNAME` and `PASSWORD`
- For Basic auth, ensure app server has Basic authentication enabled

**SSL/Certificate Errors:**
- Set `INSECURE_SKIP_TLS_VERIFY=true` for self-signed certificates
- Ensure `SSL=true` when using HTTPS

**Timeout Errors:**
- Increase batch write timeout (currently 30s)
- Reduce `BATCH_SIZE` for slower systems
- Check MarkLogic server resources (CPU, memory, disk I/O)

**Low Throughput:**
- Increase `THREAD_COUNT` for more concurrency
- Increase `BATCH_SIZE` for larger batches
- Reduce `THINK_TIME` to 0
- Check MarkLogic forest configuration and rebalancing

## Requirements

- k6 v0.45.0 or later
- MarkLogic Server 9.0 or later
- Network access to MarkLogic instance
