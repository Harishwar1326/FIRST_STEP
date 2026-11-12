import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { conceptMapController } from "../controllers/conceptMap.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.post("/generate", conceptMapController.generate);
router.post("/entity-details", conceptMapController.explainEntity);

export default router;
