/**
 * Community Feed Screen
 * Displays community posts and allows users to create new posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import database from '@react-native-firebase/database';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  List,
  Menu,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import communityService, { CommunityPost, Comment } from '../services/communityService';
import sharingService from '../services/sharingService';
import type { PokemonTheme } from '../theme';

const CommunityFeedScreen: React.FC = () => {
  const theme = useTheme<PokemonTheme>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editCaption, setEditCaption] = useState('');

  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [commentMenuVisible, setCommentMenuVisible] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    loadPosts();

    const unsubscribe = communityService.onFeedUpdate((updatedPosts) => {
      setPosts(updatedPosts);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const feedPosts = await communityService.getFeedPosts(20);
      setPosts(feedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, []);

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
      return;
    }

    setCreating(true);
    try {
      await communityService.createPost(newPostCaption.trim(), undefined, undefined, newPostImage);
      setNewPostCaption('');
      setNewPostImage(undefined);
      setCreateDialogVisible(false);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setEditCaption(post.caption);
    setEditDialogVisible(true);
    setMenuVisible(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    try {
      setCreating(true);
      await database().ref(`community/posts/${editingPost.id}`).update({ caption: editCaption.trim() });
      setEditDialogVisible(false);
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (post: CommunityPost) => {
    setMenuVisible(null);
    try {
      await communityService.deletePost(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleReportPost = async (post: CommunityPost) => {
    setMenuVisible(null);
    try {
      await communityService.reportPost(post.id, 'Inappropriate content');
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await communityService.toggleLike(postId);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const openComments = async (post: CommunityPost) => {
    setSelectedPost(post);
    setCommentsVisible(true);
    setLoadingComments(true);
    try {
      const postComments = await communityService.getComments(post.id);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) {
      return;
    }

    setAddingComment(true);
    try {
      await communityService.addComment(selectedPost.id, newComment.trim());
      const updatedComments = await communityService.getComments(selectedPost.id);
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.text);
    setCommentMenuVisible(null);
  };

  const handleSaveCommentEdit = async () => {
    if (!editingComment || !selectedPost) return;

    try {
      await communityService.updateComment(selectedPost.id, editingComment.id, editCommentText.trim());
      const updatedComments = await communityService.getComments(selectedPost.id);
      setComments(updatedComments);
      setEditingComment(null);
      setEditCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!selectedPost) return;
    setCommentMenuVisible(null);
    try {
      await communityService.deleteComment(selectedPost.id, comment.id);
      const updatedComments = await communityService.getComments(selectedPost.id);
      setComments(updatedComments);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
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

  const testFirebaseConnection = async () => {
    try {
      const testRef = database().ref('test');
      await testRef.set({
        timestamp: Date.now(),
        message: 'Test successful!',
        from: 'CommunityFeedScreen',
      });
    } catch (error) {
      console.error('Firebase test failed:', error);
    }
  };

  const isOwnPost = (post: CommunityPost) => communityService.getCurrentUserId() === post.userId;

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
    const menuOpen = menuVisible === item.id;
    const currentUserId = communityService.getCurrentUserId();
    const isLiked = currentUserId ? !!item.likedBy?.[currentUserId] : false;

    return (
      <Card style={styles.postCard}>
        <Card.Title
          title={item.username}
          subtitle={formatTimestamp(item.timestamp)}
          titleStyle={{ color: theme.colors.onSurface }}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          left={(props) =>
            item.userAvatar ? (
              <Avatar.Image {...props} source={{ uri: item.userAvatar }} />
            ) : (
              <Avatar.Text {...props} label={item.username[0]?.toUpperCase() || '?'} />
            )
          }
          right={(props) => (
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuVisible(null)}
              anchor={<IconButton {...props} icon="dots-vertical" onPress={() => setMenuVisible(item.id)} />}
            >
              {isOwnPost(item) && <Menu.Item onPress={() => handleEditPost(item)} title="Edit" />}
              {isOwnPost(item) && (
                <Menu.Item onPress={() => handleDeletePost(item)} title="Delete" />
              )}
              <Menu.Item onPress={() => handleReportPost(item)} title="Report" />
            </Menu>
          )}
        />
        {item.imageUrl && <Card.Cover source={{ uri: item.imageUrl }} style={styles.postImage} />}
        <Card.Content>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            {item.caption}
          </Text>
          {item.pokemonName && (
            <Chip
              icon="pokeball"
              style={styles.pokemonChip}
            >
              {item.pokemonName}
            </Chip>
          )}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="text"
            icon={isLiked ? 'heart' : 'heart-outline'}
            onPress={() => handleLike(item.id)}
          >
            {item.likes}
          </Button>
          <Button mode="text" icon="comment-outline" onPress={() => openComments(item)}>
            {item.commentCount}
          </Button>
          <Button mode="text" icon="share-variant" onPress={() => handleSharePost(item)}>
            Share
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <SectionCard
          title="Community Feed"
          subtitle="Share your latest catches and adventures"
          actions={
            <Button mode="contained" icon="plus" onPress={() => setCreateDialogVisible(true)}>
              New Post
            </Button>
          }
        >
          <Button mode="text" icon="database" onPress={testFirebaseConnection}>
            Test Firebase
          </Button>
        </SectionCard>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item: CommunityPost) => item.id}
            contentContainerStyle={{ paddingBottom: theme.custom.spacing.xl }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            ItemSeparatorComponent={() => <Divider style={{ opacity: 0 }} />}
          />
        )}
      </View>

      <Portal>
        <Dialog visible={createDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>New Post</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Caption"
              multiline
              value={newPostCaption}
              onChangeText={setNewPostCaption}
              mode="outlined"
            />
            {newPostImage && <Image source={{ uri: newPostImage }} style={styles.previewImage} />}
            <Button mode="text" icon="image" onPress={handleSelectImage}>
              Add Photo
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreatePost} loading={creating} disabled={creating}>
              Post
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Caption</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Caption"
              multiline
              value={editCaption}
              onChangeText={setEditCaption}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveEdit} loading={creating} disabled={creating}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Modal
          visible={commentsVisible}
          onDismiss={() => {
            setCommentsVisible(false);
            setSelectedPost(null);
            setComments([]);
            setNewComment('');
          }}
          contentContainerStyle={[styles.commentsModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.commentsHeader}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              Comments
            </Text>
            <IconButton icon="close" onPress={() => setCommentsVisible(false)} />
          </View>
          {loadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.commentsContent}>
              {comments.map((comment) => {
                const menuOpen = commentMenuVisible === comment.id;
                return (
                  <List.Item
                    key={comment.id}
                    title={comment.username}
                    description={comment.text}
                    left={(props) =>
                      comment.userAvatar ? (
                        <Avatar.Image {...props} source={{ uri: comment.userAvatar }} />
                      ) : (
                        <Avatar.Text {...props} label={comment.username[0]?.toUpperCase() || '?'} />
                      )
                    }
                    right={(props) => (
                      <Menu
                        visible={menuOpen}
                        onDismiss={() => setCommentMenuVisible(null)}
                        anchor={<IconButton {...props} icon="dots-vertical" onPress={() => setCommentMenuVisible(comment.id)} />}
                      >
                        <Menu.Item onPress={() => handleEditComment(comment)} title="Edit" />
                        <Menu.Item onPress={() => handleDeleteComment(comment)} title="Delete" />
                      </Menu>
                    )}
                  />
                );
              })}
            </View>
          )}
          <Divider />
          <View style={styles.commentComposer}>
            <TextInput
              mode="outlined"
              placeholder="Add a comment"
              value={newComment}
              onChangeText={setNewComment}
              style={styles.commentInput}
            />
            <Button
              mode="contained"
              onPress={handleAddComment}
              loading={addingComment}
              disabled={addingComment}
            >
              Send
            </Button>
          </View>
        </Modal>

        <Dialog visible={!!editingComment} onDismiss={() => setEditingComment(null)}>
          <Dialog.Title>Edit Comment</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              multiline
              value={editCommentText}
              onChangeText={setEditCommentText}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditingComment(null)}>Cancel</Button>
            <Button onPress={handleSaveCommentEdit}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    marginBottom: 12,
  },
  postImage: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  pokemonChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 12,
  },
  commentsModal: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentsContent: {
    maxHeight: 320,
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  commentInput: {
    flex: 1,
  },
});

export default CommunityFeedScreen;
