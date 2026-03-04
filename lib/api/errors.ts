export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorResponse = (status: number, message: string) => {
  return Response.json(
    {
      error: {
        message,
      },
    },
    { status },
  );
};

export const toErrorResponse = (error: unknown) => {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.message);
  }

  if (error instanceof Error) {
    return errorResponse(500, error.message);
  }

  return errorResponse(500, 'Unknown error');
};

