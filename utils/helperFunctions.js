import pool from "../db.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

export const handleInventoryHoldsOnCompletion = async (quote_id, action) => {
    const [holds] = await pool.query("SELECT * FROM quote_inventory_holds WHERE quote_id = ? AND status = 'HELD'", [quote_id]);
    if (holds.length === 0) return;

    for (const hold of holds) {
        if (action === 'USE') {
            if (hold.inventory_category === 'TRACK') {
                await pool.query("UPDATE inventory_tracks_tbl SET held_quantity = GREATEST(held_quantity - ?, 0), used_quantity = used_quantity + ? WHERE track_id = ?", [hold.held_quantity, hold.held_quantity, hold.inventory_id]);
            } else if (hold.inventory_category === 'LIGHT') {
                await pool.query("UPDATE inventory_lights_tbl SET held_quantity = GREATEST(held_quantity - ?, 0), used_quantity = used_quantity + ? WHERE light_id = ?", [hold.held_quantity, hold.held_quantity, hold.inventory_id]);
            } else if (hold.inventory_category === 'CONTROLLER') {
                await pool.query("UPDATE inventory_controllers_tbl SET held_quantity = GREATEST(held_quantity - ?, 0), used_quantity = used_quantity + ? WHERE controller_id = ?", [hold.held_quantity, hold.held_quantity, hold.inventory_id]);
            }
            await pool.query("UPDATE quote_inventory_holds SET status = 'USED', used_at = ? WHERE id = ?", [now(), hold.id]);
        } else if (action === 'RELEASE') {
            if (hold.inventory_category === 'TRACK') {
                await pool.query("UPDATE inventory_tracks_tbl SET held_quantity = GREATEST(held_quantity - ?, 0) WHERE track_id = ?", [hold.held_quantity, hold.inventory_id]);
            } else if (hold.inventory_category === 'LIGHT') {
                await pool.query("UPDATE inventory_lights_tbl SET held_quantity = GREATEST(held_quantity - ?, 0) WHERE light_id = ?", [hold.held_quantity, hold.inventory_id]);
            } else if (hold.inventory_category === 'CONTROLLER') {
                await pool.query("UPDATE inventory_controllers_tbl SET held_quantity = GREATEST(held_quantity - ?, 0) WHERE controller_id = ?", [hold.held_quantity, hold.inventory_id]);
            }
            await pool.query("UPDATE quote_inventory_holds SET status = 'RELEASED', released_at = ? WHERE id = ?", [now(), hold.id]);
        }
    }
};
