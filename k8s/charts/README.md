### How to create new chart

```
helm create ...
```

```
helm lint ...
```

```
==> Linting .../
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

Values.yaml will be overwriten from terraform. 

### Terraform module creation

e.g.

```
cd ./modules/
```

Add module definition into ../main.tf

Modify required variables.

```
module "...." {
  source                 = "../../modules/..."
  namespace              = var.ns
  depends_on             = []
  ...
}
```
Modify 

```
module/.../main.tf
module/.../*values*.yaml
module/.../outputs.tf
module/.../variables.tf
```