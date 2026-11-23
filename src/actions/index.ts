import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker.js'
import { assessPurchaseRequest } from './assess-purchase-request.js'

export const actions: Record<string, ActionHandler<Env>> = {
  'assess-purchase-request': assessPurchaseRequest,
}
