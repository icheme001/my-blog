import bcrypt from "bcryptjs";
import { supabase } from "../config/db.js";

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    console.log('=== GET ALL USERS ===');
    console.log('Requested by:', req.user.email, '(Role:', req.user.role, ')');

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Found ${data.length} users`);
    res.json(data);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update user (admin can update any user)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    console.log('=== UPDATE USER ===');
    console.log('Updating user ID:', id);
    console.log('Updated by:', req.user.email);

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from demoting themselves
    if (req.user.id === parseInt(id) && role && role !== 'admin') {
      return res.status(400).json({ 
        message: "You cannot change your own admin role" 
      });
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && ['admin', 'user'].includes(role)) updateData.role = role;
    
    // Hash password if provided
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, created_at')
      .single();

    if (error) throw error;

    console.log('User updated successfully');
    res.json(data);
  } catch (err) {
    console.error('Error updating user:', err);
    
    // Handle unique constraint violation (duplicate email)
    if (err.code === '23505') {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// Delete user (admin only, cannot delete self)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('=== DELETE USER ===');
    console.log('Deleting user ID:', id);
    console.log('Deleted by:', req.user.email);

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ 
        message: "You cannot delete your own account" 
      });
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user (cascade will handle related data)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('User deleted successfully:', existingUser.email);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get admin count
    const { count: adminCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    // Get regular user count
    const { count: regularUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    res.json({
      totalUsers: totalUsers || 0,
      adminUsers: adminCount || 0,
      regularUsers: regularUsers || 0
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: err.message });
  }
};