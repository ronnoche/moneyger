interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: Params) {
  void request;
  void context;
  return Response.json(
    { error: { message: 'Account allocations are retired. Use bucket assignments instead.' } },
    { status: 410 },
  );
}

export async function DELETE(_: Request, context: Params) {
  void context;
  return Response.json(
    { error: { message: 'Account allocations are retired. Use bucket assignments instead.' } },
    { status: 410 },
  );
}

