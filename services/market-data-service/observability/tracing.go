package observability

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
	apitrace "go.opentelemetry.io/otel/trace"
)

func InitTracing(serviceName string) func() {
	exp, _ := stdouttrace.New(stdouttrace.WithPrettyPrint())
	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
		)),
	)
	otel.SetTracerProvider(provider)
	return func() { provider.Shutdown(context.Background()) }
}

func StartSpan(ctx context.Context, name string) (context.Context, apitrace.Span) {
	return otel.Tracer(name).Start(ctx, name)
}
