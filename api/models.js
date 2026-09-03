// Lists the models your NVIDIA key can actually use, and which one the server
// would pick. Open /api/models on the deployed site when you want to set
// NVIDIA_MODEL by hand, or to check a key works at all.

import { listModels, resolveModel, fail } from "./_nvidia.js";

export default async function handler(req, res) {
  try {
    const models = await listModels();
    res.status(200).json({
      count: models.length,
      using: await resolveModel(),
      pinned: process.env.NVIDIA_MODEL || null,
      models,
    });
  } catch (err) {
    fail(res, err);
  }
}
