import { supabase } from "../config/db.js";
import { generateSlug } from "../utils/generateSlug.js";

export const createPost = async (req, res) => {
  try {
    const { title, content, excerpt, meta_title, meta_description, image_url } = req.body;
    const slug = generateSlug(title);
    const authorId = req.user.id;

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          slug,
          content,
          excerpt: excerpt || null,
          image_url: image_url || null,
          meta_title: meta_title || null,
          meta_description: meta_description || null,
          author_id: authorId,
          published: false
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users:author_id (name)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData = data.map(post => ({
      ...post,
      author_name: post.users?.name
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Error getting user posts:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // First get the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (postError || !post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Then get the author details separately
    const { data: author } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', post.author_id)
      .single();

    // Get like count
    const { count: likeCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    // Format the response
    const formattedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      image_url: post.image_url,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      author_id: post.author_id,
      author_name: author?.name || 'Anonymous',
      published: post.published,
      created_at: post.created_at,
      updated_at: post.updated_at,
      like_count: likeCount || 0
    };

    res.json(formattedPost);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: err.message });
  }
};

// NEW: Get post by ID for editing - checks ownership
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('=== Get Post By ID Debug ===');
    console.log('Post ID:', id);
    console.log('User ID:', userId);
    console.log('User Role:', userRole);

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      console.log('Post not found');
      return res.status(404).json({ message: 'Post not found' });
    }

    console.log('Post author_id:', post.author_id);

    // Check permissions: admin can see all, users can only see their own
    if (userRole !== 'admin' && post.author_id !== userId) {
      console.log('Access denied - not owner or admin');
      return res.status(403).json({ message: 'You do not have permission to edit this post' });
    }

    // Get author details
    const { data: author } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', post.author_id)
      .single();

    const formattedPost = {
      ...post,
      author_name: author?.name || 'Anonymous'
    };

    console.log('Access granted - returning post');
    res.json(formattedPost);
  } catch (err) {
    console.error('Error getting post by ID:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    // First get all posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique author IDs
    const authorIds = [...new Set(posts.map(post => post.author_id))];

    // Fetch all authors in one query
    const { data: authors } = await supabase
      .from('users')
      .select('id, name')
      .in('id', authorIds);

    // Create a map of author_id to author_name
    const authorMap = {};
    authors?.forEach(author => {
      authorMap[author.id] = author.name;
    });

    // Format the response with author names
    const formattedData = posts.map(post => ({
      ...post,
      author_name: authorMap[post.author_id] || 'Anonymous'
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Error getting posts:', err);
    res.status(500).json({ message: err.message });
  }
};

export const editPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, meta_title, meta_description, image_url, published } = req.body;

    const updateData = {};
    if (title) {
      updateData.title = title;
      updateData.slug = generateSlug(title);
    }
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (published !== undefined) updateData.published = published;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: "Post not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Error editing post:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get ALL posts for admin (including unpublished)
export const getAllPostsAdmin = async (req, res) => {
  try {
    // Get ALL posts (including unpublished) for admin
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique author IDs
    const authorIds = [...new Set(posts.map(post => post.author_id))];

    // Fetch all authors in one query
    const { data: authors } = await supabase
      .from('users')
      .select('id, name')
      .in('id', authorIds);

    // Create a map of author_id to author_name
    const authorMap = {};
    authors?.forEach(author => {
      authorMap[author.id] = author.name;
    });

    // Format the response with author names
    const formattedData = posts.map(post => ({
      ...post,
      author_name: authorMap[post.author_id] || 'Anonymous'
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Error getting all posts for admin:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get single post by ID (for admin - can see unpublished)
export const getPostByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get author details
    const { data: author } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', post.author_id)
      .single();

    const formattedPost = {
      ...post,
      author_name: author?.name || 'Anonymous'
    };

    res.json(formattedPost);
  } catch (err) {
    console.error('Error fetching post by ID:', err);
    res.status(500).json({ error: err.message });
  }
};