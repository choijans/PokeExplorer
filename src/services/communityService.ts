/**
 * Community Service
 * Handles Firebase Realtime Database operations for community feed
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  pokemonId?: number;
  pokemonName?: string;
  imageUrl?: string;
  caption: string;
  timestamp: number;
  likes: number;
  likedBy: Record<string, boolean>;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  editedAt?: number;
}

class CommunityService {
  private postsRef = database().ref('community/posts');
  private commentsRef = database().ref('community/comments');
  private usersRef = database().ref('users');

  /**
   * Extract username from email address
   * Example: "sum@gmail.com" -> "sum"
   */
  private extractUsernameFromEmail(email: string): string {
    if (!email) return 'Anonymous';
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email;
    return email.substring(0, atIndex);
  }

  /**
   * Create a new community post
   */
  async createPost(
    caption: string,
    pokemonId?: number,
    pokemonName?: string,
    imageUrl?: string
  ): Promise<string> {
    try {
      console.log('[CommunityService] Creating post with caption:', caption);
      const user = auth().currentUser;
      if (!user) {
        console.error('[CommunityService] User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[CommunityService] Current user:', user.uid);

      // Get user profile
      const userProfile = await this.getUserProfile(user.uid);
      console.log('[CommunityService] User profile:', userProfile);

      const postRef = this.postsRef.push();
      const postId = postRef.key!;
      console.log('[CommunityService] Generated post ID:', postId);

      const post: Omit<CommunityPost, 'id'> = {
        userId: user.uid,
        username: userProfile.username || user.displayName || (user.email ? this.extractUsernameFromEmail(user.email) : 'Anonymous'),
        userAvatar: userProfile.avatar || user.photoURL || undefined,
        pokemonId,
        pokemonName,
        imageUrl,
        caption,
        timestamp: database.ServerValue.TIMESTAMP as any,
        likes: 0,
        likedBy: {},
        commentCount: 0,
      };

      console.log('[CommunityService] Saving post to Firebase...');
      await postRef.set(post);
      console.log('[CommunityService] Post saved successfully!');
      return postId;
    } catch (error) {
      console.error('[CommunityService] Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get community feed posts (paginated)
   */
  async getFeedPosts(limit: number = 20, lastTimestamp?: number): Promise<CommunityPost[]> {
    try {
      console.log('[CommunityService] getFeedPosts called with limit:', limit);
      let query = this.postsRef.orderByChild('timestamp');

      if (lastTimestamp) {
        query = query.endAt(lastTimestamp - 1);
      }

      console.log('[CommunityService] Fetching from Firebase...');
      const snapshot = await query.limitToLast(limit).once('value');
      console.log('[CommunityService] Snapshot received, exists:', snapshot.exists());
      
      const posts: CommunityPost[] = [];

      snapshot.forEach((childSnapshot) => {
        const post = childSnapshot.val();
        posts.unshift({
          id: childSnapshot.key!,
          ...post,
        });
        return undefined;
      });

      console.log('[CommunityService] Processed posts:', posts.length);
      return posts.reverse();
    } catch (error) {
      console.error('[CommunityService] Error fetching feed:', error);
      return [];
    }
  }

  /**
   * Get user's posts
   */
  async getUserPosts(userId: string): Promise<CommunityPost[]> {
    try {
      const snapshot = await this.postsRef
        .orderByChild('userId')
        .equalTo(userId)
        .once('value');

      const posts: CommunityPost[] = [];

      snapshot.forEach((childSnapshot) => {
        const post = childSnapshot.val();
        posts.unshift({
          id: childSnapshot.key!,
          ...post,
        });
        return undefined;
      });

      return posts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return [];
    }
  }

  /**
   * Like/Unlike a post
   */
  async toggleLike(postId: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const postRef = this.postsRef.child(postId);
      const snapshot = await postRef.once('value');
      const post = snapshot.val();

      if (!post) {
        throw new Error('Post not found');
      }

      const likedBy = post.likedBy || {};
      const hasLiked = likedBy[user.uid];

      if (hasLiked) {
        // Unlike
        await postRef.update({
          likes: Math.max(0, post.likes - 1),
          [`likedBy/${user.uid}`]: null,
        });
      } else {
        // Like
        await postRef.update({
          likes: post.likes + 1,
          [`likedBy/${user.uid}`]: true,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: string, text: string): Promise<string> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userProfile = await this.getUserProfile(user.uid);

      const commentRef = this.commentsRef.child(postId).push();
      const commentId = commentRef.key!;

      const comment: Omit<Comment, 'id'> = {
        postId,
        userId: user.uid,
        username: userProfile.username || user.displayName || (user.email ? this.extractUsernameFromEmail(user.email) : 'Anonymous'),
        userAvatar: userProfile.avatar || user.photoURL || undefined,
        text,
        timestamp: database.ServerValue.TIMESTAMP as any,
      };

      await commentRef.set(comment);

      // Increment comment count on post
      await this.postsRef.child(postId).child('commentCount').transaction((current) => {
        return (current || 0) + 1;
      });

      return commentId;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string): Promise<Comment[]> {
    try {
      const snapshot = await this.commentsRef.child(postId).once('value');
      const comments: Comment[] = [];

      snapshot.forEach((childSnapshot) => {
        const comment = childSnapshot.val();
        comments.push({
          id: childSnapshot.key!,
          ...comment,
        });
        return undefined;
      });

      return comments.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Update comment (only by owner)
   */
  async updateComment(postId: string, commentId: string, text: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const snapshot = await this.commentsRef.child(postId).child(commentId).once('value');
      const comment = snapshot.val();

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.userId !== user.uid) {
        throw new Error('Not authorized to edit this comment');
      }

      await this.commentsRef.child(postId).child(commentId).update({
        text,
        editedAt: database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete comment (only by owner)
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const snapshot = await this.commentsRef.child(postId).child(commentId).once('value');
      const comment = snapshot.val();

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.userId !== user.uid) {
        throw new Error('Not authorized to delete this comment');
      }

      // Delete comment
      await this.commentsRef.child(postId).child(commentId).remove();

      // Decrement comment count on post
      await this.postsRef.child(postId).child('commentCount').transaction((current) => {
        return Math.max((current || 0) - 1, 0);
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Delete post (only by owner)
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const snapshot = await this.postsRef.child(postId).once('value');
      const post = snapshot.val();

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.userId !== user.uid) {
        throw new Error('Not authorized to delete this post');
      }

      // Delete post and its comments
      await Promise.all([
        this.postsRef.child(postId).remove(),
        this.commentsRef.child(postId).remove(),
      ]);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Report post (for moderation)
   */
  async reportPost(postId: string, reason: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await database().ref(`reports/posts/${postId}`).push({
        reportedBy: user.uid,
        reason,
        timestamp: database.ServerValue.TIMESTAMP,
      });

      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error reporting post:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const snapshot = await this.usersRef.child(userId).once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {};
    }
  }

  /**
   * Listen to feed updates in real-time
   */
  onFeedUpdate(callback: (posts: CommunityPost[]) => void): () => void {
    console.log('[CommunityService] Setting up real-time listener for feed');
    const listener = this.postsRef
      .orderByChild('timestamp')
      .limitToLast(20)
      .on('value', (snapshot) => {
        console.log('[CommunityService] Real-time update triggered, exists:', snapshot.exists());
        const posts: CommunityPost[] = [];

        snapshot.forEach((childSnapshot) => {
          const post = childSnapshot.val();
          posts.unshift({
            id: childSnapshot.key!,
            ...post,
          });
          return undefined;
        });

        console.log('[CommunityService] Real-time posts processed:', posts.length);
        callback(posts.reverse());
      });

    return () => {
      console.log('[CommunityService] Removing real-time listener');
      this.postsRef.off('value', listener);
    };
  }

  /**
   * Listen to post comments in real-time
   */
  onCommentsUpdate(postId: string, callback: (comments: Comment[]) => void): () => void {
    const listener = this.commentsRef.child(postId).on('value', (snapshot) => {
      const comments: Comment[] = [];

      snapshot.forEach((childSnapshot) => {
        const comment = childSnapshot.val();
        comments.push({
          id: childSnapshot.key!,
          ...comment,
        });
        return undefined;
      });

      callback(comments.sort((a, b) => a.timestamp - b.timestamp));
    });

    return () => {
      this.commentsRef.child(postId).off('value', listener);
    };
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    const user = auth().currentUser;
    return user ? user.uid : null;
  }
}

export default new CommunityService();
