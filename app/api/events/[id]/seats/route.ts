import { json, serviceState } from '@/lib/serviceState';
export async function GET(_: Request, { params }: { params: { id: string } }) {
  return json({ seats: serviceState.seats[params.id] ?? [] });
}
