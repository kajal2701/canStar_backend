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
  // Outer Cases
  getOutercases, addOutercase, editOutercase, deleteOutercase,
  // App Controllers
  getAppcontrollers, addAppcontroller, editAppcontroller, deleteAppcontroller,
  // Power Supplies
  getPowersupplies, addPowersupply, editPowersupply, deletePowersupply,
  // Inventory Holds
  getHoldOptions, holdInventory, getHeldInventory
} from "../controllers/inventoryController.js";

const router = express.Router();

// Holds
router.get("/hold-options/:quoteId", getHoldOptions);
router.post("/hold", holdInventory);
router.get("/held/:quoteId", getHeldInventory);

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

// Outer Cases
router.get("/outercases", getOutercases);
router.post("/outercases/add", addOutercase);
router.post("/outercases/edit", editOutercase);
router.post("/outercases/delete", deleteOutercase);

// App Controllers
router.get("/appcontrollers", getAppcontrollers);
router.post("/appcontrollers/add", addAppcontroller);
router.post("/appcontrollers/edit", editAppcontroller);
router.post("/appcontrollers/delete", deleteAppcontroller);

// Power Supplies
router.get("/powersupplies", getPowersupplies);
router.post("/powersupplies/add", addPowersupply);
router.post("/powersupplies/edit", editPowersupply);
router.post("/powersupplies/delete", deletePowersupply);

export default router;
