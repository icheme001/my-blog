import { supabase } from "../config/db.js";

// Get all comments for a post
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // First get all comments
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, comment, created_at, user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique user IDs
    const userIds = [...new Set(comments.map(comment => comment.user_id))];

    // Fetch all users in one query
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    // Create a map of user_id to user_name
    const userMap = {};
    users?.forEach(user => {
      userMap[user.id] = user.name;
    });

    // Format the response with user names
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      comment: comment.comment,
      created_at: comment.created_at,
      user_id: comment.user_id,
      user_name: userMap[comment.user_id] || 'Anonymous'
    }));

    res.json(formattedComments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // Insert the comment
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          comment: comment.trim()
        }
      ])
      .select('id, comment, created_at, user_id')
      .single();

    if (error) throw error;

    // Fetch the user details separately
    const { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    // Format the response
    const formattedComment = {
      id: newComment.id,
      comment: newComment.comment,
      created_at: newComment.created_at,
      user_id: newComment.user_id,
      user_name: user?.name || 'Anonymous'
    };

    res.status(201).json(formattedComment);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if comment exists and belongs to user (or user is admin)
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only comment owner or admin can delete
    if (comment.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: err.message });
  }
};