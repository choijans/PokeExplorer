/**
 * Community Feed Screen
 * Displays community posts and allows users to create new posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import database from '@react-native-firebase/database';
import communityService, { CommunityPost, Comment } from '../services/communityService';
import sharingService from '../services/sharingService';
import { launchImageLibrary } from 'react-native-image-picker';

const CommunityFeedScreen: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  
  // Edit/Delete states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  
  // Dropdown menu state
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  
  // Comments state
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  
  // Comment edit/delete states
  const [commentMenuVisible, setCommentMenuVisible] = useState<string | null>(null);
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    console.log('[CommunityFeed] Component mounted, starting to load posts...');
    loadPosts();
    
    // Set up real-time listener
    console.log('[CommunityFeed] Setting up real-time listener...');
    const unsubscribe = communityService.onFeedUpdate((updatedPosts) => {
      console.log('[CommunityFeed] Real-time update received:', updatedPosts.length, 'posts');
      setPosts(updatedPosts);
      setLoading(false);
    });

    return () => {
      console.log('[CommunityFeed] Cleaning up real-time listener');
      unsubscribe();
    };
  }, []);

  const loadPosts = async () => {
    console.log('[CommunityFeed] loadPosts called');
    try {
      setLoading(true);
      const feedPosts = await communityService.getFeedPosts(20);
      console.log('[CommunityFeed] Loaded posts:', feedPosts.length, 'posts');
      setPosts(feedPosts);
    } catch (error) {
      console.error('[CommunityFeed] Error loading posts:', error);
      Alert.alert('Error', 'Failed to load community posts: ' + (error as Error).message);
    } finally {
      setLoading(false);
      console.log('[CommunityFeed] Loading finished, loading state:', false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, []);

  const handleLike = async (postId: string) => {
    try {
      await communityService.toggleLike(postId);
      // Update handled by real-time listener
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleSelectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      },
      (response: any) => {
        if (response.didCancel) {
          return;
        }

        if (response.errorCode) {
          Alert.alert('Error', 'Failed to select image');
          return;
        }

        if (response.assets && response.assets[0]) {
          setNewPostImage(response.assets[0].uri);
        }
      }
    );
  };

  const handleCreatePost = async () => {
    if (!newPostCaption.trim()) {
      Alert.alert('Error', 'Please enter a caption');
      return;
    }

    setCreating(true);
    try {
      await communityService.createPost(
        newPostCaption.trim(),
        undefined,
        undefined,
        newPostImage
      );

      setNewPostCaption('');
      setNewPostImage(undefined);
      setCreateModalVisible(false);
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      console.log('[CommunityFeed] Testing Firebase connection...');
      Alert.alert('Testing...', 'Attempting to connect to Firebase...');
      
      const testRef = database().ref('test');
      await testRef.set({ 
        timestamp: Date.now(), 
        message: 'Test successful!',
        from: 'CommunityFeedScreen'
      });
      
      const snapshot = await testRef.once('value');
      const data = snapshot.val();
      console.log('[CommunityFeed] Test data:', data);
      
      Alert.alert(
        'Success! ✅', 
        'Firebase is working!\n\n' + 
        'Data: ' + JSON.stringify(data, null, 2) +
        '\n\nYou can now check Firebase Console to see if posts are being created.'
      );
    } catch (error) {
      console.error('[CommunityFeed] Firebase test failed:', error);
      Alert.alert(
        'Connection Failed ❌', 
        'Firebase connection failed:\n\n' + 
        (error as Error).message +
        '\n\nPlease check:\n' +
        '1. Firebase Realtime Database is enabled\n' +
        '2. Database rules allow read/write\n' +
        '3. Internet connection is working'
      );
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setEditCaption(post.caption);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editCaption.trim()) {
      Alert.alert('Error', 'Caption cannot be empty');
      return;
    }

    try {
      setCreating(true);
      await database()
        .ref(`community/posts/${editingPost.id}`)
        .update({ caption: editCaption.trim() });
      
      setEditModalVisible(false);
      setEditingPost(null);
      setEditCaption('');
      Alert.alert('Success', 'Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = (post: CommunityPost) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityService.deletePost(post.id);
              Alert.alert('Success', 'Post deleted successfully!');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleOpenComments = async (post: CommunityPost) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
    setLoadingComments(true);
    
    try {
      const postComments = await communityService.getComments(post.id);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setAddingComment(true);
    try {
      await communityService.addComment(selectedPost.id, newComment.trim());
      setNewComment('');
      
      // Reload comments
      const updatedComments = await communityService.getComments(selectedPost.id);
      setComments(updatedComments);
      
      Alert.alert('Success', 'Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.text);
    setCommentMenuVisible(null);
    setEditCommentModalVisible(true);
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !selectedPost || !editCommentText.trim()) {
      Alert.alert('Error', 'Please enter comment text');
      return;
    }

    try {
      await communityService.updateComment(selectedPost.id, editingComment.id, editCommentText.trim());
      
      // Reload comments
      const updatedComments = await communityService.getComments(selectedPost.id);
      setComments(updatedComments);
      
      setEditCommentModalVisible(false);
      setEditingComment(null);
      setEditCommentText('');
      
      Alert.alert('Success', 'Comment updated!');
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    setCommentMenuVisible(null);
    
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!selectedPost) return;
              
              await communityService.deleteComment(selectedPost.id, comment.id);
              
              // Reload comments
              const updatedComments = await communityService.getComments(selectedPost.id);
              setComments(updatedComments);
              
              Alert.alert('Success', 'Comment deleted!');
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handleSharePost = async (post: CommunityPost) => {
    try {
      const message = `${post.caption}\n\n${post.pokemonName ? `Pokémon: ${post.pokemonName}\n` : ''}Shared from PokeExplorer`;
      
      if (post.imageUrl) {
        await sharingService.sharePhoto(post.imageUrl, post.pokemonName, message);
      } else {
        await sharingService.sharePokemonDetails({
          id: post.pokemonId || 0,
          name: post.pokemonName || 'Unknown',
          types: [],
          height: 0,
          weight: 0,
          abilities: [],
          stats: [],
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const isOwnPost = communityService.getCurrentUserId() === item.userId;
    const isMenuOpen = menuVisible === item.id;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>

          {/* Dropdown Menu Button */}
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(isMenuOpen ? null : item.id)}
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(null);
                    handleSharePost(item);
                  }}
                >
                  <Text style={styles.menuItemIcon}>📤</Text>
                  <Text style={styles.menuItemText}>Share</Text>
                </TouchableOpacity>

                {isOwnPost && (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuVisible(null);
                        handleEditPost(item);
                      }}
                    >
                      <Text style={styles.menuItemIcon}>✏️</Text>
                      <Text style={styles.menuItemText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, styles.menuItemDanger]}
                      onPress={() => {
                        setMenuVisible(null);
                        handleDeletePost(item);
                      }}
                    >
                      <Text style={styles.menuItemIcon}>🗑️</Text>
                      <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.postContent}>
        {item.pokemonName && (
          <Text style={styles.pokemonTag}>#{item.pokemonName}</Text>
        )}
        <Text style={styles.caption}>{item.caption}</Text>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <Text style={styles.actionIcon}>
            {item.likedBy && communityService.getCurrentUserId() && item.likedBy[communityService.getCurrentUserId()!] ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenComments(item)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{item.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1} 
      onPress={() => menuVisible && setMenuVisible(null)}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createButtonText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5aa0" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share your discovery!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Create Post Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              multiline
              value={newPostCaption}
              onChangeText={setNewPostCaption}
              maxLength={500}
            />

            {newPostImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: newPostImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setNewPostImage(undefined)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.imageButton} onPress={handleSelectImage}>
                <Text style={styles.imageButtonText}>📷 Add Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.postButton, creating && styles.postButtonDisabled]}
                onPress={handleCreatePost}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="Edit your caption..."
              placeholderTextColor="#999"
              value={editCaption}
              onChangeText={setEditCaption}
              multiline
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.postButton, creating && styles.postButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.commentsModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments ({selectedPost?.commentCount || 0})</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <View style={styles.commentsContainer}>
              {loadingComments ? (
                <ActivityIndicator size="large" color="#2c5aa0" style={{marginTop: 20}} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => {
                    const currentUserId = communityService.getCurrentUserId();
                    const isOwner = item.userId === currentUserId;
                    const isMenuOpen = commentMenuVisible === item.id;
                    
                    return (
                      <View style={[
                        styles.commentItem,
                        isMenuOpen && { zIndex: 1000, elevation: 1000 }
                      ]}>
                        {item.userAvatar ? (
                          <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
                        ) : (
                          <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                          </View>
                        )}
                        <View style={styles.commentContent}>
                          <Text style={styles.commentUsername}>{item.username}</Text>
                          <Text style={styles.commentText}>{item.text}</Text>
                          <Text style={styles.commentTime}>
                            {formatTimestamp(item.timestamp)}
                            {item.editedAt && ' (edited)'}
                          </Text>
                        </View>
                        
                        {/* Comment Actions - Only for owner */}
                        {isOwner && (
                          <View style={styles.commentMenuContainer}>
                            <TouchableOpacity
                              style={styles.commentMenuButton}
                              onPress={() => setCommentMenuVisible(commentMenuVisible === item.id ? null : item.id)}
                            >
                              <Text style={styles.menuIcon}>⋮</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  }}
                  style={styles.commentsList}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{ paddingBottom: 100 }}
                />
              )}
              
            </View>

            {/* Add Comment Input */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, addingComment && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={addingComment || !newComment.trim()}
              >
                {addingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Floating Comment Dropdown Menu */}
            {commentMenuVisible && comments.find(c => c.id === commentMenuVisible) && (
              <View style={styles.floatingDropdownOverlay}>
                <View style={styles.floatingDropdownMenu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      const comment = comments.find(c => c.id === commentMenuVisible);
                      if (comment) handleEditComment(comment);
                    }}
                  >
                    <Text style={styles.menuItemIcon}>✏️</Text>
                    <Text style={styles.menuItemText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, styles.menuItemDanger]}
                    onPress={() => {
                      const comment = comments.find(c => c.id === commentMenuVisible);
                      if (comment) handleDeleteComment(comment);
                    }}
                  >
                    <Text style={styles.menuItemIcon}>🗑️</Text>
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Comment Modal */}
      <Modal
        visible={editCommentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditCommentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Comment</Text>
              <TouchableOpacity onPress={() => setEditCommentModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="Edit your comment..."
              placeholderTextColor="#999"
              value={editCommentText}
              onChangeText={setEditCommentText}
              multiline
              maxLength={500}
            />
            
            <Text style={styles.charCount}>{editCommentText.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.postButton, !editCommentText.trim() && styles.postButtonDisabled]}
                onPress={handleSaveEditComment}
                disabled={!editCommentText.trim()}
              >
                <Text style={styles.postButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  testButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#2c5aa0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2c5aa0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  testButtonLarge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  testButtonLargeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    padding: 8,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#2c5aa0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postContent: {
    padding: 12,
  },
  pokemonTag: {
    fontSize: 14,
    color: '#2c5aa0',
    fontWeight: '600',
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
  },
  imagePreviewContainer: {
    marginTop: 16,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  imageButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c5aa0',
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#2c5aa0',
    fontSize: 16,
    fontWeight: '600',
  },
  postButton: {
    flex: 1,
    backgroundColor: '#2c5aa0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuContainer: {
    position: 'relative',
    marginLeft: 'auto',
  },
  menuButton: {
    padding: 8,
    paddingRight: 4,
  },
  menuIcon: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
    letterSpacing: -2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuItemTextDanger: {
    color: '#ff3b30',
  },
  // Comments Modal Styles
  commentsModal: {
    height: '70%',
  },
  commentsContainer: {
    flex: 1,
    overflow: 'visible',
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  commentsList: {
    flex: 1,
    overflow: 'visible',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    overflow: 'visible',
    zIndex: 1,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  addCommentContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#2c5aa0',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Comment menu styles
  commentMenuContainer: {
    position: 'relative',
    marginLeft: 8,
    zIndex: 100,
  },
  commentMenuButton: {
    padding: 4,
    zIndex: 101,
  },
  commentDropdownMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 9999,
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  // Floating dropdown overlay (outside scroll container)
  floatingDropdownOverlay: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10000,
    elevation: 10000,
  },
  floatingDropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
});

export default CommunityFeedScreen;
