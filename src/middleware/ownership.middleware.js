// Check if user is admin OR owns the post
export const canModifyPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admins can modify any post
    if (userRole === 'admin') {
      return next();
    }

    // Check if user owns the post
    const { supabase } = await import('../config/db.js');
    const { data: post, error } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.author_id !== userId) {
      return res.status(403).json({ message: 'You do not have permission to modify this post' });
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ message: 'Error checking post ownership' });
  }
};