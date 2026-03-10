import React, { useState, useEffect } from 'react';
import { analytics } from '../analytics/analytics-client';

interface UGCPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'photo_review' | 'book_club' | 'reading_session' | 'creative_content';
  title: string;
  content: string;
  images: string[];
  videos: string[];
  tags: string[];
  productId?: string;
  productName?: string;
  likes: number;
  comments: Comment[];
  shares: number;
  verified: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  replies: Comment[];
  createdAt: Date;
}

interface BookClub {
  id: string;
  name: string;
  description: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  organizerId: string;
  organizerName: string;
  members: {
    userId: string;
    userName: string;
    userAvatar: string;
    joinedAt: Date;
    role: 'organizer' | 'moderator' | 'member';
  }[];
  meetings: {
    id: string;
    title: string;
    description: string;
    scheduledFor: Date;
    duration: number;
    meetingLink: string;
    attendees: string[];
    status: 'scheduled' | 'completed' | 'cancelled';
  }[];
  discussions: {
    id: string;
    title: string;
    content: string;
    userId: string;
    userName: string;
    createdAt: Date;
    replies: Comment[];
  }[];
  isPublic: boolean;
  maxMembers: number;
  tags: string[];
  createdAt: Date;
}

interface WritingContest {
  id: string;
  title: string;
  description: string;
  theme: string;
  category: 'poetry' | 'short_story' | 'essay' | 'children_story';
  startDate: Date;
  endDate: Date;
  prizes: {
    position: number;
    prize: string;
    value: number;
  }[];
  rules: string[];
  judges: {
    name: string;
    bio: string;
    avatar: string;
  }[];
  submissions: {
    id: string;
    userId: string;
    userName: string;
    title: string;
    content: string;
    category: string;
    submittedAt: Date;
    status: 'submitted' | 'under_review' | 'approved' | 'rejected';
    votes: number;
    judgeScore?: number;
  }[];
  status: 'upcoming' | 'active' | 'judging' | 'completed';
  winner?: {
    userId: string;
    userName: string;
    submissionId: string;
    title: string;
    prize: string;
  };
  createdAt: Date;
}

const CommunityHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'book_clubs' | 'contests' | 'my_content'>('feed');
  const [posts, setPosts] = useState<UGCPost[]>([]);
  const [bookClubs, setBookClubs] = useState<BookClub[]>([]);
  const [contests, setContests] = useState<WritingContest[]>([]);
  const [userContent, setUserContent] = useState<UGCPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hashtag, setHashtag] = useState('#SingglebeeReads');

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      
      // In production, fetch from API
      const mockData = await getMockCommunityData();
      
      setPosts(mockData.posts);
      setBookClubs(mockData.bookClubs);
      setContests(mockData.contests);
      setUserContent(mockData.userContent);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load community data:', error);
      setLoading(false);
    }
  };

  const getMockCommunityData = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      posts: [
        {
          id: '1',
          userId: 'user1',
          userName: 'Priya Kumar',
          userAvatar: '/images/avatar1.jpg',
          type: 'photo_review',
          title: 'Beautiful Tamil Poetry Collection',
          content: 'Just received my order and the quality is amazing! The paper quality and binding are perfect. Love supporting local Tamil publishers! 📚',
          images: ['/images/review1.jpg', '/images/review2.jpg'],
          videos: [],
          tags: ['tamil_books', 'book_review', 'local_publisher'],
          productId: 'book-001',
          productName: 'Tamil Poetry Collection Vol 1',
          likes: 45,
          comments: [
            {
              id: 'c1',
              userId: 'user2',
              userName: 'Rahul S',
              userAvatar: '/images/avatar2.jpg',
              content: 'I have this collection too! Absolutely love it.',
              likes: 12,
              replies: [],
              createdAt: new Date('2024-03-09T10:30:00Z')
            }
          ],
          shares: 8,
          verified: true,
          featured: true,
          createdAt: new Date('2024-03-08T14:20:00Z'),
          updatedAt: new Date('2024-03-08T14:20:00Z')
        },
        {
          id: '2',
          userId: 'user3',
          userName: 'Meena R',
          userAvatar: '/images/avatar3.jpg',
          type: 'reading_session',
          title: 'Cozy Reading Time with SINGGLEBEE Books',
          content: 'Nothing beats a peaceful evening with a good Tamil book. The stories take me back to my childhood! 🌙',
          images: ['/images/reading1.jpg'],
          videos: ['/videos/reading1.mp4'],
          tags: ['reading_time', 'tamil_literature', 'cozy_vibes'],
          likes: 67,
          comments: [],
          shares: 15,
          verified: true,
          featured: false,
          createdAt: new Date('2024-03-07T18:45:00Z'),
          updatedAt: new Date('2024-03-07T18:45:00Z')
        }
      ],
      bookClubs: [
        {
          id: 'bc1',
          name: 'Classical Tamil Poetry Readers',
          description: 'A community for lovers of classical Tamil poetry. We meet weekly to discuss and appreciate the works of great Tamil poets.',
          bookId: 'book-002',
          bookTitle: 'Classical Tamil Poetry Anthology',
          bookCover: '/images/book2.jpg',
          organizerId: 'user4',
          organizerName: 'Dr. Lakshmi Narayanan',
          members: [
            {
              userId: 'user4',
              userName: 'Dr. Lakshmi Narayanan',
              userAvatar: '/images/avatar4.jpg',
              joinedAt: new Date('2024-02-01T00:00:00Z'),
              role: 'organizer'
            },
            {
              userId: 'user5',
              userName: 'Aravind S',
              userAvatar: '/images/avatar5.jpg',
              joinedAt: new Date('2024-02-05T00:00:00Z'),
              role: 'moderator'
            },
            {
              userId: 'user6',
              userName: 'Priya K',
              userAvatar: '/images/avatar6.jpg',
              joinedAt: new Date('2024-02-10T00:00:00Z'),
              role: 'member'
            }
          ],
          meetings: [
            {
              id: 'm1',
              title: 'Chapter 5: Thiruvalluvar Discussion',
              description: 'Deep dive into Thiruvalluvar\'s couplets and their modern relevance',
              scheduledFor: new Date('2024-03-15T18:00:00Z'),
              duration: 90,
              meetingLink: 'https://meet.jit.si/SingglebeePoetryClub',
              attendees: ['user4', 'user5', 'user6'],
              status: 'scheduled'
            }
          ],
          discussions: [
            {
              id: 'd1',
              title: 'Favorite couplets from Thirukkural?',
              content: 'Share your favorite Thirukkural couplets and explain why they resonate with you.',
              userId: 'user4',
              userName: 'Dr. Lakshmi Narayanan',
              createdAt: new Date('2024-03-10T10:00:00Z'),
              replies: [
                {
                  id: 'r1',
                  userId: 'user5',
                  userName: 'Aravind S',
                  userAvatar: '/images/avatar5.jpg',
                  content: '"Agathin azhagu pidiththu arandhe" - Even the wise will go wrong if they act without thought',
                  likes: 8,
                  replies: [],
                  createdAt: new Date('2024-03-10T11:30:00Z')
                }
              ]
            }
          ],
          isPublic: true,
          maxMembers: 50,
          tags: ['tamil_poetry', 'thirukkural', 'thiruvalluvar', 'book_club'],
          createdAt: new Date('2024-02-01T00:00:00Z')
        }
      ],
      contests: [
        {
          id: 'contest1',
          title: 'Tamil Children\'s Story Writing Contest 2024',
          description: 'Write an original Tamil children\'s story (500-1000 words) that teaches a valuable life lesson. Open to all ages!',
          theme: 'Wisdom through Stories',
          category: 'children_story',
          startDate: new Date('2024-03-01T00:00:00Z'),
          endDate: new Date('2024-03-31T23:59:59Z'),
          prizes: [
            {
              position: 1,
              prize: '₹10,000 + Publishing Opportunity',
              value: 10000
            },
            {
              position: 2,
              prize: '₹5,000 + SINGGLEBEE Book Collection',
              value: 5000
            },
            {
              position: 3,
              prize: '₹2,500 + Gift Hamper',
              value: 2500
            }
          ],
          rules: [
            'Story must be original and in Tamil',
            'Word count: 500-1000 words',
            'Must teach a valuable life lesson',
            'Appropriate for children aged 6-12',
            'No offensive content',
            'Submit by March 31, 2024'
          ],
          judges: [
            {
              name: 'Mrs. Revathi Sampath',
              bio: 'Award-winning Tamil children\'s author with 15+ years of experience',
              avatar: '/images/judge1.jpg'
            },
            {
              name: 'Dr. Karthik Raghavan',
              bio: 'Professor of Tamil Literature at Chennai University',
              avatar: '/images/judge2.jpg'
            }
          ],
          submissions: [
            {
              id: 'sub1',
              userId: 'user7',
              userName: 'Little Author',
              title: 'The Wise Monkey and the Mango Tree',
              content: 'Once upon a time, there was a clever monkey who learned an important lesson about patience...',
              category: 'children_story',
              submittedAt: new Date('2024-03-05T14:30:00Z'),
              status: 'submitted',
              votes: 23
            }
          ],
          status: 'active',
          createdAt: new Date('2024-02-15T00:00:00Z')
        }
      ],
      userContent: []
    };
  };

  const handleLikePost = async (postId: string) => {
    try {
      // In production, call API to like post
      const updatedPosts = posts.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      );
      setPosts(updatedPosts);
      
      analytics.track('community_post_liked', {
        post_id: postId,
        source: 'community_hub'
      });
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleJoinBookClub = async (clubId: string) => {
    try {
      // In production, call API to join book club
      analytics.track('book_club_joined', {
        club_id: clubId,
        source: 'community_hub'
      });
      
      alert('Successfully joined the book club! Check your email for meeting details.');
    } catch (error) {
      console.error('Failed to join book club:', error);
    }
  };

  const handleSubmitContest = async (contestId: string) => {
    try {
      analytics.track('contest_submitted', {
        contest_id: contestId,
        source: 'community_hub'
      });
      
      alert('Contest submission received! Good luck!');
    } catch (error) {
      console.error('Failed to submit contest:', error);
    }
  };

  const handleUploadContent = async (content: {
    type: 'photo_review' | 'book_club' | 'reading_session' | 'creative_content';
    title: string;
    description: string;
    images: File[];
  }) => {
    try {
      // In production, upload content to API
      analytics.track('ugc_uploaded', {
        content_type: content.type,
        source: 'community_hub'
      });
      
      alert('Content uploaded successfully! You\'ll earn 50 loyalty points for your contribution.');
    } catch (error) {
      console.error('Failed to upload content:', error);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.content.includes(hashtag.replace('#', '')) || 
    post.tags.some(tag => tag.toLowerCase().includes(hashtag.replace('#', '').toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-orange-600">📚 SINGGLEBEE Community</h1>
              <div className="hidden md:flex items-center space-x-2 bg-orange-100 px-3 py-1 rounded-full">
                <span className="text-orange-800 font-medium">{hashtag}</span>
                <span className="text-orange-600 text-sm">1,234 posts</span>
              </div>
            </div>
            <button
              onClick={() => handleUploadContent({ type: 'photo_review', title: '', description: '', images: [] })}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              📸 Share Your Story
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'feed', label: '📱 Community Feed', count: posts.length },
              { id: 'book_clubs', label: '📖 Book Clubs', count: bookClubs.length },
              { id: 'contests', label: '✍️ Writing Contests', count: contests.filter(c => c.status === 'active').length },
              { id: 'my_content', label: '🌟 My Content', count: userContent.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'feed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Community Feed</h2>
              <div className="flex items-center space-x-4">
                <select className="border rounded-lg px-3 py-2">
                  <option>Most Recent</option>
                  <option>Most Liked</option>
                  <option>Most Commented</option>
                  <option>Featured</option>
                </select>
                <input
                  type="text"
                  placeholder="Search community posts..."
                  className="border rounded-lg px-3 py-2 w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {post.type === 'photo_review' && (
                    <div className="relative">
                      <img 
                        src={post.images[0]} 
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                      {post.verified && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                          ✓ Verified
                        </div>
                      )}
                      {post.featured && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs">
                          ⭐ Featured
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <img 
                        src={post.userAvatar} 
                        alt={post.userName}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium text-gray-900">{post.userName}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{post.content}</p>
                    
                    {post.productName && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                        <p className="text-sm text-orange-800">
                          📦 Product: <span className="font-medium">{post.productName}</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <span>❤️</span>
                          <span className="text-sm">{post.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                          <span>💬</span>
                          <span className="text-sm">{post.comments.length}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500 transition-colors">
                          <span>🔄</span>
                          <span className="text-sm">{post.shares}</span>
                        </button>
                      </div>
                      <button className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'book_clubs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Book Clubs</h2>
              <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                ➕ Create Book Club
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookClubs.map(club => (
                <div key={club.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4 mb-4">
                    <img 
                      src={club.bookCover} 
                      alt={club.bookTitle}
                      className="w-16 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{club.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{club.description}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500">👥 {club.members.length} members</span>
                        <span className="text-gray-500">📖 {club.bookTitle}</span>
                        {club.isPublic && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Organized by {club.organizerName}</span>
                      <span className="text-sm text-gray-500">
                        Started {new Date(club.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {club.meetings.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          📅 Next Meeting: {new Date(club.meetings[0].scheduledFor).toLocaleString()}
                        </p>
                        <p className="text-sm text-blue-700">{club.meetings[0].title}</p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleJoinBookClub(club.id)}
                      className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Join Book Club
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'contests' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Writing Contests</h2>
              <select className="border rounded-lg px-3 py-2">
                <option>All Contests</option>
                <option>Active</option>
                <option>Upcoming</option>
                <option>Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contests.map(contest => (
                <div key={contest.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 p-4 text-white">
                    <h3 className="font-bold text-lg mb-2">{contest.title}</h3>
                    <p className="text-sm mb-3">{contest.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">🏆 Theme: {contest.theme}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        contest.status === 'active' ? 'bg-green-500' :
                        contest.status === 'upcoming' ? 'bg-blue-500' :
                        contest.status === 'judging' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}>
                        {contest.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-medium">{new Date(contest.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">End Date</p>
                        <p className="font-medium">{new Date(contest.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">🎁 Prizes:</p>
                      <div className="space-y-1">
                        {contest.prizes.map((prize, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <span className="font-medium">{prize.position}:</span>
                            <span>{prize.prize}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {contest.submissions.length} submissions
                      </div>
                      <button
                        onClick={() => handleSubmitContest(contest.id)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                        disabled={contest.status !== 'active'}
                      >
                        {contest.status === 'active' ? 'Submit Entry' : 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'my_content' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">My Content</h2>
              <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                📤 Upload New Content
              </button>
            </div>

            {userContent.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No content yet</h3>
                <p className="text-gray-600 mb-6">
                  Share your SINGGLEBEE experience with the community! Upload photos, reviews, and reading sessions.
                </p>
                <button className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600">
                  Share Your First Story
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userContent.map(content => (
                  <div key={content.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <img 
                      src={content.images[0]} 
                      alt={content.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{content.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{content.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>❤️ {content.likes}</span>
                          <span>💬 {content.comments.length}</span>
                          <span>🔄 {content.shares}</span>
                        </div>
                        <button className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                          Edit
                        </button>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHub;
