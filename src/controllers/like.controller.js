import { supabase } from "../config/db.js";

// Check if user has liked a post
export const checkLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw error;
    }

    res.json({ liked: !!data });
  } catch (err) {
    console.error('Error checking like:', err);
    res.status(500).json({ error: err.message });
  }
};

// Like a post
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      return res.status(400).json({ message: "Post already liked" });
    }

    // Create like
    const { error } = await supabase
      .from('likes')
      .insert([
        {
          post_id: postId,
          user_id: userId
        }
      ]);

    if (error) throw error;

    // Get updated like count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.status(201).json({ 
      message: "Post liked successfully",
      likeCount: count 
    });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: err.message });
  }
};

// Unlike a post
export const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;

    // Get updated like count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.json({ 
      message: "Post unliked successfully",
      likeCount: count 
    });
  } catch (err) {
    console.error('Error unliking post:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get like count for a post
export const getLikeCount = async (req, res) => {
  try {
    const { postId } = req.params;

    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) throw error;

    res.json({ likeCount: count || 0 });
  } catch (err) {
    console.error('Error getting like count:', err);
    res.status(500).json({ error: err.message });
  }
};