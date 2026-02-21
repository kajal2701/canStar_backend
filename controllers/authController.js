import pool from "../db.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1 - check if email and password are provided
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Step 2 - find user in database by email
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    const user = rows[0];

    // Step 3 - if user not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 4 - check password (plain text comparison without bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Step 5 - send user data to frontend (without password)
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
