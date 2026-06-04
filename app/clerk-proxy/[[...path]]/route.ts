import { proxyClerkFrontendApi } from "@/lib/clerk-fapi-proxy"

export async function GET(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}

export async function POST(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}

export async function PUT(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}

export async function PATCH(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}

export async function DELETE(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}

export async function OPTIONS(request: Request): Promise<Response> {
  return proxyClerkFrontendApi(request)
}
