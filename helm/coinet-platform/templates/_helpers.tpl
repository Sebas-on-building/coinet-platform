{{/*
  Atomic Helm helpers for Coinet Platform
*/}}

{{- define "coinet-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "coinet-platform.labels" -}}
app.kubernetes.io/name: {{ include "coinet-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}} 