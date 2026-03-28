import express from "express";
import {
  // Tracks
  getTracks, addTrack, editTrack, deleteTrack,
  // Screws
  getScrews, addScrew, editScrew, deleteScrew,
  // Power Cords
  getPowercords, addPowercord, editPowercord, deletePowercord,
  // Plugs
  getPlugs, addPlug, editPlug, deletePlug,
  // Lights
  getLights, addLight, editLight, deleteLight,
  // Jumpers
  getJumpers, addJumper, editJumper, deleteJumper,
  // Controllers
  getControllers, addController, editController, deleteController,
  // Connectors
  getConnectors, addConnector, editConnector, deleteConnector,
  // Cables
  getCables, addCable, editCable, deleteCable,
} from "../controllers/inventoryController.js";

const router = express.Router();

// Tracks
router.get("/tracks", getTracks);
router.post("/tracks/add", addTrack);
router.post("/tracks/edit", editTrack);
router.post("/tracks/delete", deleteTrack);

// Screws
router.get("/screws", getScrews);
router.post("/screws/add", addScrew);
router.post("/screws/edit", editScrew);
router.post("/screws/delete", deleteScrew);

// Power Cords
router.get("/powercords", getPowercords);
router.post("/powercords/add", addPowercord);
router.post("/powercords/edit", editPowercord);
router.post("/powercords/delete", deletePowercord);

// Plugs
router.get("/plugs", getPlugs);
router.post("/plugs/add", addPlug);
router.post("/plugs/edit", editPlug);
router.post("/plugs/delete", deletePlug);

// Lights
router.get("/lights", getLights);
router.post("/lights/add", addLight);
router.post("/lights/edit", editLight);
router.post("/lights/delete", deleteLight);

// Jumpers
router.get("/jumpers", getJumpers);
router.post("/jumpers/add", addJumper);
router.post("/jumpers/edit", editJumper);
router.post("/jumpers/delete", deleteJumper);

// Controllers
router.get("/controllers", getControllers);
router.post("/controllers/add", addController);
router.post("/controllers/edit", editController);
router.post("/controllers/delete", deleteController);

// Connectors
router.get("/connectors", getConnectors);
router.post("/connectors/add", addConnector);
router.post("/connectors/edit", editConnector);
router.post("/connectors/delete", deleteConnector);

// Cables
router.get("/cables", getCables);
router.post("/cables/add", addCable);
router.post("/cables/edit", editCable);
router.post("/cables/delete", deleteCable);

export default router;
