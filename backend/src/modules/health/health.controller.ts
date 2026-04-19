import { Request, Response } from 'express';
import { handleApiResponse, handleErrorResponse } from '@utils/handleResponse';
import { getConnectorHealth } from './health.repository';

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  try {
    handleApiResponse(res, { data: await getConnectorHealth() });
  } catch (err) {
    handleErrorResponse(res, { statusCode: 500, message: (err as Error).message, error: err });
  }
}
