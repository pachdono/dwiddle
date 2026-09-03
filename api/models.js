// Lists the models your NVIDIA key can actually use, and which one the server
// would pick. Open /api/models on the deployed site when you want to set
// NVIDIA_MODEL by hand, or to check a key works at all.

import { listModels, candidates, fail } from "./_nvidia.js";

export default async function handler(req, res) {
  try {
    const [models, order] = await Promise.all([listModels(), candidates()]);
    res.status(200).json({
      count: models.length,
      pinned: process.env.NVIDIA_MODEL || null,
      // Tried in this order until one answers. Being listed does not mean a
      // key can call it, so the first entry is a first choice, not a promise.
      willTry: order.slice(0, 8),
      models,
    });
  } catch (err) {
    fail(res, err);
  }
}
