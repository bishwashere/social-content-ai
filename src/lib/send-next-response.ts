import { NextResponse } from "next/server";

export interface Response {
  status: number;
  message: string;
  error?: unknown;
  data?: unknown;
}

export const sendNextResponse = (res: Response) => {
  return NextResponse.json(
    {
      ...res,
      error: res.error ? JSON.stringify(res.error) : undefined,
    },
    {
      status: res.status || 200,
    }
  );
};
