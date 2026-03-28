/**
 * @file inventoryController.js
 * @description CRUD controllers for all inventory categories.
 *
 * Base URL : /inventory
 *
 * Categories & endpoints:
 * ┌─────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
 * │ Category        │ Endpoints                                                                               │
 * ├─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Tracks          │ GET /tracks | POST /tracks/add | POST /tracks/edit | POST /tracks/delete               │
 * │ Screws          │ GET /screws | POST /screws/add | POST /screws/edit | POST /screws/delete               │
 * │ Power Cords     │ GET /powercords | POST /powercords/add | POST /powercords/edit | POST /powercords/delete│
 * │ Plugs           │ GET /plugs | POST /plugs/add | POST /plugs/edit | POST /plugs/delete                   │
 * │ Lights          │ GET /lights | POST /lights/add | POST /lights/edit | POST /lights/delete               │
 * │ Jumpers         │ GET /jumpers | POST /jumpers/add | POST /jumpers/edit | POST /jumpers/delete           │
 * │ Controllers     │ GET /controllers | POST /controllers/add | POST /controllers/edit | POST .../delete    │
 * │ Connectors      │ GET /connectors | POST /connectors/add | POST /connectors/edit | POST .../delete       │
 * │ Cables          │ GET /cables | POST /cables/add | POST /cables/edit | POST /cables/delete               │
 * └─────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Response shape:
 *   Success (list) : { success: true, data: [...] }
 *   Success (write): { success: true, status_code: "1", message: "..." }
 *   Not found      : { success: false, message: "Record not found." }          HTTP 404
 *   Server error   : { success: false, message: "<error message>" }            HTTP 500
 */

import pool from "../db.js";

// ─── RESPONSE HELPERS ──────────────────────────────────────────────────────────
const ok       = (res, data) => res.status(200).json({ success: true, data });
const created  = (res, msg)  => res.status(200).json({ success: true, status_code: "1", message: msg });
const notFound = (res)       => res.status(404).json({ success: false, message: "Record not found." });
const err      = (res, e)    => res.status(500).json({ success: false, message: e.message });

// ════════════════════════════════════════════════════════════════════════════════
// TRACKS  (inventory_tracks_tbl)
// Fields : track_id | color | supplier | totalLength | size | cost | price | quantity
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/tracks
 * Returns all track records ordered by newest first.
 *
 * @response 200 { success, data: Track[] }
 */
export const getTracks = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_tracks_tbl ORDER BY track_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/tracks/add
 * Creates a new track record.
 *
 * @body {string} color
 * @body {string} supplier
 * @body {number} totalLength
 * @body {string} size
 * @body {number} cost
 * @body {number} price
 * @body {number} quantity
 *
 * @response 200 { success, status_code, message }
 */
export const addTrack = async (req, res) => {
  try {
    const { color, supplier, totalLength, size, cost, price, quantity } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_tracks_tbl SET ?",
      [{ color, supplier, totalLength, size, cost, price, quantity }]
    );
    if (result.affectedRows > 0) return created(res, "Track added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/tracks/edit
 * Updates an existing track record by track_id.
 *
 * @body {number} track_id   - Required. ID of the track to update.
 * @body {string} color
 * @body {string} supplier
 * @body {number} totalLength
 * @body {string} size
 * @body {number} cost
 * @body {number} price
 * @body {number} quantity
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editTrack = async (req, res) => {
  try {
    const { track_id, color, supplier, totalLength, size, cost, price, quantity } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_tracks_tbl SET color=?, supplier=?, totalLength=?, size=?, cost=?, price=?, quantity=? WHERE track_id=?",
      [color, supplier, totalLength, size, cost, price, quantity, track_id]
    );
    if (result.affectedRows > 0) return created(res, "Track updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/tracks/delete
 * Permanently deletes a track record.
 *
 * @body {number} track_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteTrack = async (req, res) => {
  try {
    const { track_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_tracks_tbl WHERE track_id=?", [track_id]);
    if (result.affectedRows > 0) return created(res, "Track deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// SCREWS  (inventory_screws_tbl)
// Fields : screw_id | color | quantity | cost | price
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/screws
 * Returns all screw records ordered by newest first.
 *
 * @response 200 { success, data: Screw[] }
 */
export const getScrews = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_screws_tbl ORDER BY screw_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/screws/add
 * Creates a new screw record.
 *
 * @body {string} color
 * @body {number} quantity
 * @body {number} cost
 * @body {number} price
 *
 * @response 200 { success, status_code, message }
 */
export const addScrew = async (req, res) => {
  try {
    const { color, quantity, cost, price } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_screws_tbl SET ?",
      [{ color, quantity, cost, price }]
    );
    if (result.affectedRows > 0) return created(res, "Screw added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/screws/edit
 * Updates an existing screw record.
 *
 * @body {number} screw_id   - Required.
 * @body {string} color
 * @body {number} quantity
 * @body {number} cost
 * @body {number} price
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editScrew = async (req, res) => {
  try {
    const { screw_id, color, quantity, cost, price } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_screws_tbl SET color=?, quantity=?, cost=?, price=? WHERE screw_id=?",
      [color, quantity, cost, price, screw_id]
    );
    if (result.affectedRows > 0) return created(res, "Screw updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/screws/delete
 * Permanently deletes a screw record.
 *
 * @body {number} screw_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteScrew = async (req, res) => {
  try {
    const { screw_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_screws_tbl WHERE screw_id=?", [screw_id]);
    if (result.affectedRows > 0) return created(res, "Screw deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// POWER CORDS  (inventory_powercord_tbl)
// Fields : powercord_id | type | quantity | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/powercords
 * Returns all power cord records ordered by newest first.
 *
 * @response 200 { success, data: Powercord[] }
 */
export const getPowercords = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_powercord_tbl ORDER BY powercord_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/powercords/add
 * Creates a new power cord record.
 *
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addPowercord = async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_powercord_tbl SET ?",
      [{ type, quantity, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Power cord added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/powercords/edit
 * Updates an existing power cord record.
 *
 * @body {number} powercord_id   - Required.
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]        - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editPowercord = async (req, res) => {
  try {
    const { powercord_id, type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_powercord_tbl SET type=?, quantity=?, notes=? WHERE powercord_id=?",
      [type, quantity, notes || null, powercord_id]
    );
    if (result.affectedRows > 0) return created(res, "Power cord updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/powercords/delete
 * Permanently deletes a power cord record.
 *
 * @body {number} powercord_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deletePowercord = async (req, res) => {
  try {
    const { powercord_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_powercord_tbl WHERE powercord_id=?", [powercord_id]);
    if (result.affectedRows > 0) return created(res, "Power cord deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// PLUGS  (inventory_plugs_tbl)
// Fields : plug_id | type | quantity | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/plugs
 * Returns all plug records ordered by newest first.
 *
 * @response 200 { success, data: Plug[] }
 */
export const getPlugs = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_plugs_tbl ORDER BY plug_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/plugs/add
 * Creates a new plug record.
 *
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addPlug = async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_plugs_tbl SET ?",
      [{ type, quantity, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Plug added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/plugs/edit
 * Updates an existing plug record.
 *
 * @body {number} plug_id   - Required.
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editPlug = async (req, res) => {
  try {
    const { plug_id, type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_plugs_tbl SET type=?, quantity=?, notes=? WHERE plug_id=?",
      [type, quantity, notes || null, plug_id]
    );
    if (result.affectedRows > 0) return created(res, "Plug updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/plugs/delete
 * Permanently deletes a plug record.
 *
 * @body {number} plug_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deletePlug = async (req, res) => {
  try {
    const { plug_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_plugs_tbl WHERE plug_id=?", [plug_id]);
    if (result.affectedRows > 0) return created(res, "Plug deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// LIGHTS  (inventory_lights_tbl)
// Fields : light_id | type | quantity | cost | purchaseInfo (nullable) | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/lights
 * Returns all light records ordered by newest first.
 *
 * @response 200 { success, data: Light[] }
 */
export const getLights = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_lights_tbl ORDER BY light_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/lights/add
 * Creates a new light record.
 *
 * @body {string} type
 * @body {number} quantity
 * @body {number} cost
 * @body {string} [purchaseInfo]   - Optional. Purchase details / invoice reference.
 * @body {string} [notes]          - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addLight = async (req, res) => {
  try {
    const { type, quantity, cost, purchaseInfo, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_lights_tbl SET ?",
      [{ type, quantity, cost, purchaseInfo: purchaseInfo || null, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Light added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/lights/edit
 * Updates an existing light record.
 *
 * @body {number} light_id         - Required.
 * @body {string} type
 * @body {number} quantity
 * @body {number} cost
 * @body {string} [purchaseInfo]   - Optional.
 * @body {string} [notes]          - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editLight = async (req, res) => {
  try {
    const { light_id, type, quantity, cost, purchaseInfo, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_lights_tbl SET type=?, quantity=?, cost=?, purchaseInfo=?, notes=? WHERE light_id=?",
      [type, quantity, cost, purchaseInfo || null, notes || null, light_id]
    );
    if (result.affectedRows > 0) return created(res, "Light updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/lights/delete
 * Permanently deletes a light record.
 *
 * @body {number} light_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteLight = async (req, res) => {
  try {
    const { light_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_lights_tbl WHERE light_id=?", [light_id]);
    if (result.affectedRows > 0) return created(res, "Light deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// JUMPERS  (inventory_jumpers_tbl)
// Fields : jumper_id | type | quantity | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/jumpers
 * Returns all jumper records ordered by newest first.
 *
 * @response 200 { success, data: Jumper[] }
 */
export const getJumpers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_jumpers_tbl ORDER BY jumper_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/jumpers/add
 * Creates a new jumper record.
 *
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addJumper = async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_jumpers_tbl SET ?",
      [{ type, quantity, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Jumper added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/jumpers/edit
 * Updates an existing jumper record.
 *
 * @body {number} jumper_id   - Required.
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]     - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editJumper = async (req, res) => {
  try {
    const { jumper_id, type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_jumpers_tbl SET type=?, quantity=?, notes=? WHERE jumper_id=?",
      [type, quantity, notes || null, jumper_id]
    );
    if (result.affectedRows > 0) return created(res, "Jumper updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/jumpers/delete
 * Permanently deletes a jumper record.
 *
 * @body {number} jumper_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteJumper = async (req, res) => {
  try {
    const { jumper_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_jumpers_tbl WHERE jumper_id=?", [jumper_id]);
    if (result.affectedRows > 0) return created(res, "Jumper deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// CONTROLLERS  (inventory_controllers_tbl)
// Fields : controller_id | type | boostBox | cost | price
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/controllers
 * Returns all controller records ordered by newest first.
 *
 * @response 200 { success, data: Controller[] }
 */
export const getControllers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_controllers_tbl ORDER BY controller_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/controllers/add
 * Creates a new controller record.
 *
 * @body {string} type
 * @body {string|number} boostBox   - Boost box reference / quantity.
 * @body {number} cost
 * @body {number} price
 *
 * @response 200 { success, status_code, message }
 */
export const addController = async (req, res) => {
  try {
    const { type, boostBox, cost, price } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_controllers_tbl SET ?",
      [{ type, boostBox, cost, price }]
    );
    if (result.affectedRows > 0) return created(res, "Controller added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/controllers/edit
 * Updates an existing controller record.
 *
 * @body {number} controller_id   - Required.
 * @body {string} type
 * @body {string|number} boostBox
 * @body {number} cost
 * @body {number} price
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editController = async (req, res) => {
  try {
    const { controller_id, type, boostBox, cost, price } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_controllers_tbl SET type=?, boostBox=?, cost=?, price=? WHERE controller_id=?",
      [type, boostBox, cost, price, controller_id]
    );
    if (result.affectedRows > 0) return created(res, "Controller updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/controllers/delete
 * Permanently deletes a controller record.
 *
 * @body {number} controller_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteController = async (req, res) => {
  try {
    const { controller_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_controllers_tbl WHERE controller_id=?", [controller_id]);
    if (result.affectedRows > 0) return created(res, "Controller deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// CONNECTORS  (inventory_connectors_tbl)
// Fields : connector_id | name | type | cost | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/connectors
 * Returns all connector records ordered by newest first.
 *
 * @response 200 { success, data: Connector[] }
 */
export const getConnectors = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_connectors_tbl ORDER BY connector_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/connectors/add
 * Creates a new connector record.
 *
 * @body {string} name
 * @body {string} type
 * @body {number} cost
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addConnector = async (req, res) => {
  try {
    const { name, type, cost, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_connectors_tbl SET ?",
      [{ name, type, cost, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Connector added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/connectors/edit
 * Updates an existing connector record.
 *
 * @body {number} connector_id   - Required.
 * @body {string} name
 * @body {string} type
 * @body {number} cost
 * @body {string} [notes]        - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editConnector = async (req, res) => {
  try {
    const { connector_id, name, type, cost, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_connectors_tbl SET name=?, type=?, cost=?, notes=? WHERE connector_id=?",
      [name, type, cost, notes || null, connector_id]
    );
    if (result.affectedRows > 0) return created(res, "Connector updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/connectors/delete
 * Permanently deletes a connector record.
 *
 * @body {number} connector_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteConnector = async (req, res) => {
  try {
    const { connector_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_connectors_tbl WHERE connector_id=?", [connector_id]);
    if (result.affectedRows > 0) return created(res, "Connector deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

// ════════════════════════════════════════════════════════════════════════════════
// CABLES  (inventory_cables_tbl)
// Fields : cable_id | type | quantity | notes (nullable)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /inventory/cables
 * Returns all cable records ordered by newest first.
 *
 * @response 200 { success, data: Cable[] }
 */
export const getCables = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM inventory_cables_tbl ORDER BY cable_id DESC");
    ok(res, rows);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/cables/add
 * Creates a new cable record.
 *
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]   - Optional.
 *
 * @response 200 { success, status_code, message }
 */
export const addCable = async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "INSERT INTO inventory_cables_tbl SET ?",
      [{ type, quantity, notes: notes || null }]
    );
    if (result.affectedRows > 0) return created(res, "Cable added successfully.");
    res.status(200).json({ success: false, status_code: "0", message: "Failed." });
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/cables/edit
 * Updates an existing cable record.
 *
 * @body {number} cable_id   - Required.
 * @body {string} type
 * @body {number} quantity
 * @body {string} [notes]    - Optional.
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const editCable = async (req, res) => {
  try {
    const { cable_id, type, quantity, notes } = req.body;
    const [result] = await pool.query(
      "UPDATE inventory_cables_tbl SET type=?, quantity=?, notes=? WHERE cable_id=?",
      [type, quantity, notes || null, cable_id]
    );
    if (result.affectedRows > 0) return created(res, "Cable updated successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};

/**
 * POST /inventory/cables/delete
 * Permanently deletes a cable record.
 *
 * @body {number} cable_id
 *
 * @response 200 { success, status_code, message }
 * @response 404 { success: false, message }
 */
export const deleteCable = async (req, res) => {
  try {
    const { cable_id } = req.body;
    const [result] = await pool.query("DELETE FROM inventory_cables_tbl WHERE cable_id=?", [cable_id]);
    if (result.affectedRows > 0) return created(res, "Cable deleted successfully.");
    notFound(res);
  } catch (e) { err(res, e); }
};
