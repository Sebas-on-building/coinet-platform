import React, { useState, useEffect } from "react";
import {
  financialEventService,
  FinancialEvent,
  Comment,
  Watchlist,
} from "../services/financialEventService";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  ExternalLink,
  Bell,
  Share2,
  BarChart2,
  MessageSquare,
  Heart,
  Bookmark,
  Users,
  Plus,
} from "lucide-react";

export const FinancialEvents: React.FC = () => {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    FinancialEvent["category"] | "all"
  >("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSourceType, setSelectedSourceType] = useState<
    FinancialEvent["sourceType"] | "all"
  >("all");
  const [reminderMinutes, setReminderMinutes] = useState<number>(10);
  const [selectedEvent, setSelectedEvent] = useState<FinancialEvent | null>(
    null,
  );
  const [commentContent, setCommentContent] = useState("");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);

  useEffect(() => {
    loadEvents();
    loadWatchlists();
  }, []);

  const loadEvents = async () => {
    try {
      const fetchedEvents = await financialEventService.fetchEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      toast.error("Failed to load financial events");
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlists = async () => {
    // TODO: Implement actual watchlist loading
    setWatchlists([]);
  };

  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === "all" || event.category === selectedCategory;
    const matchesRelevance = event.relevance >= minRelevance;
    const matchesSearch =
      searchQuery === "" ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.speaker?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => event.tags.includes(tag));
    const matchesSourceType =
      selectedSourceType === "all" || event.sourceType === selectedSourceType;

    return (
      matchesCategory &&
      matchesRelevance &&
      matchesSearch &&
      matchesTags &&
      matchesSourceType
    );
  });

  const allTags = Array.from(new Set(events.flatMap((event) => event.tags)));

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "bullish":
        return "text-green-600 bg-green-50";
      case "bearish":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleSetReminder = async (event: FinancialEvent) => {
    try {
      await financialEventService.scheduleEventNotifications(
        event,
        reminderMinutes,
      );
      toast.success(`Reminder set for ${reminderMinutes} minutes before event`);
    } catch (error) {
      toast.error("Failed to set reminder");
    }
  };

  const handleShareEvent = async (event: FinancialEvent) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.description,
          url: event.sourceUrl,
        });
      } else {
        await navigator.clipboard.writeText(
          `${event.title}\n${event.description}\n${event.sourceUrl}`,
        );
        toast.success("Event link copied to clipboard");
      }
    } catch (error) {
      toast.error("Failed to share event");
    }
  };

  const handleAddComment = async (eventId: string) => {
    if (!commentContent.trim()) return;

    try {
      await financialEventService.addComment(
        eventId,
        "user",
        "Current User",
        commentContent,
      );
      setCommentContent("");
      toast.success("Comment added successfully");
      loadEvents(); // Refresh events to get updated comments
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleLikeComment = async (eventId: string, commentId: string) => {
    try {
      await financialEventService.likeComment(eventId, commentId);
      loadEvents(); // Refresh events to get updated likes
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) return;

    try {
      const watchlist = await financialEventService.createWatchlist(
        newWatchlistName,
        "user",
      );
      setWatchlists([...watchlists, watchlist]);
      setNewWatchlistName("");
      setShowWatchlistModal(false);
      toast.success("Watchlist created successfully");
    } catch (error) {
      toast.error("Failed to create watchlist");
    }
  };

  const handleAddToWatchlist = async (watchlistId: string, eventId: string) => {
    try {
      await financialEventService.addToWatchlist(watchlistId, eventId);
      toast.success("Added to watchlist");
      loadEvents(); // Refresh events to update watchlist count
    } catch (error) {
      toast.error("Failed to add to watchlist");
    }
  };

  if (loading) {
    return <div>Loading financial events...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Financial Events</h3>
        <button
          onClick={loadEvents}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value as FinancialEvent["category"] | "all",
              )
            }
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="speech">Speeches</option>
            <option value="meeting">Meetings</option>
            <option value="report">Reports</option>
            <option value="earnings">Earnings</option>
            <option value="other">Other</option>
          </select>
          <select
            value={minRelevance}
            onChange={(e) => setMinRelevance(Number(e.target.value))}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="0">All Relevance</option>
            <option value="50">High Relevance (50+)</option>
            <option value="75">Very High Relevance (75+)</option>
            <option value="90">Critical Relevance (90+)</option>
          </select>
          <select
            value={selectedSourceType}
            onChange={(e) =>
              setSelectedSourceType(
                e.target.value as FinancialEvent["sourceType"] | "all",
              )
            }
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="official">Official</option>
            <option value="social">Social Media</option>
            <option value="news">News</option>
            <option value="community">Community</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600">Reminder Time:</label>
          <select
            value={reminderMinutes}
            onChange={(e) => setReminderMinutes(Number(e.target.value))}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="5">5 minutes before</option>
            <option value="10">10 minutes before</option>
            <option value="15">15 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag)
                    ? prev.filter((t) => t !== tag)
                    : [...prev, tag],
                );
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag)
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist Modal */}
      {showWatchlistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Watchlist</h3>
            <input
              type="text"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              placeholder="Watchlist name"
              className="w-full px-4 py-2 rounded-md border border-gray-300 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowWatchlistModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No events found</div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{event.title}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4" />
                    <span>{event.startTime.toLocaleDateString()}</span>
                    <Clock className="w-4 h-4 ml-2" />
                    <span>{formatTime(event.startTime)}</span>
                    {event.speaker && (
                      <span className="ml-2">by {event.speaker}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getSentimentColor(event.marketSentiment)}`}
                  >
                    {event.marketSentiment?.toUpperCase() || "NEUTRAL"}
                  </span>
                  <span className="text-sm text-gray-500">
                    Relevance: {event.relevance}%
                  </span>
                  <span className="text-sm text-gray-500">
                    Confidence: {event.confidence}%
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-2">{event.description}</p>

              {/* Real-time Price Impact */}
              {event.realTimeImpact && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">Real-time Impact</h5>
                    <span className="text-xs text-gray-500">
                      Updated {formatTimeAgo(event.realTimeImpact.lastUpdated)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {event.realTimeImpact.priceImpacts.map((impact) => (
                      <div key={impact.asset} className="text-center">
                        <div className="text-sm font-medium">
                          {impact.asset.toUpperCase()}
                        </div>
                        <div
                          className={`text-lg font-semibold ${impact.change >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {impact.current.toFixed(2)}
                          {impact.unit}
                        </div>
                        <div
                          className={`text-xs ${impact.change >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {impact.change >= 0 ? "+" : ""}
                          {impact.change.toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Volume Change</div>
                      <div
                        className={`text-sm font-medium ${event.realTimeImpact.volumeChange >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {event.realTimeImpact.volumeChange >= 0 ? "+" : ""}
                        {event.realTimeImpact.volumeChange.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">
                        Volatility Change
                      </div>
                      <div
                        className={`text-sm font-medium ${event.realTimeImpact.volatilityChange >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {event.realTimeImpact.volatilityChange >= 0 ? "+" : ""}
                        {event.realTimeImpact.volatilityChange.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Impact Analysis */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-xs text-green-700 font-medium">
                    Best Case
                  </div>
                  <div className="text-sm text-green-600">
                    {event.impact.bestCase}
                  </div>
                  {event.impact.priceImpact && (
                    <div className="mt-1 text-xs text-green-600">
                      {event.impact.priceImpact.btc &&
                        `BTC: +${event.impact.priceImpact.btc.max}%`}
                      {event.impact.priceImpact.eth &&
                        ` ETH: +${event.impact.priceImpact.eth.max}%`}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-xs text-red-700 font-medium">
                    Worst Case
                  </div>
                  <div className="text-sm text-red-600">
                    {event.impact.worstCase}
                  </div>
                  {event.impact.priceImpact && (
                    <div className="mt-1 text-xs text-red-600">
                      {event.impact.priceImpact.btc &&
                        `BTC: ${event.impact.priceImpact.btc.min}%`}
                      {event.impact.priceImpact.eth &&
                        ` ETH: ${event.impact.priceImpact.eth.min}%`}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-700 font-medium">
                    Expected
                  </div>
                  <div className="text-sm text-gray-600">
                    {event.impact.expectedCase}
                  </div>
                  {event.impact.volumeImpact && (
                    <div className="mt-1 text-xs text-gray-600">
                      Volume: {event.impact.volumeImpact.expected}
                      {event.impact.volumeImpact.unit}
                    </div>
                  )}
                </div>
              </div>

              {/* Social Engagement */}
              {event.sourceType === "social" && event.engagement && (
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {event.engagement.comments?.toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {event.engagement.likes?.toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <Share2 className="w-4 h-4 mr-1" />
                    {event.engagement.shares?.toLocaleString()}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Comments Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">
                    Comments ({event.comments.length})
                  </h5>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {event.comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {comment.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(comment.timestamp)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {comment.content}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <button
                          onClick={() =>
                            handleLikeComment(event.id, comment.id)
                          }
                          className="text-xs text-gray-500 hover:text-red-500 flex items-center"
                        >
                          <Heart className="w-3 h-3 mr-1" />
                          {comment.likes}
                        </button>
                        <button className="text-xs text-gray-500 hover:text-indigo-500">
                          Reply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-1 text-sm rounded-md border border-gray-300"
                  />
                  <button
                    onClick={() => handleAddComment(event.id)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Post
                  </button>
                </div>
              </div>

              {/* Event Actions */}
              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowWatchlistModal(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <Bookmark className="w-4 h-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => handleShareEvent(event)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </button>
                  <button
                    onClick={() => handleSetReminder(event)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <Bell className="w-4 h-4 mr-1" />
                    Remind
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    <Users className="w-4 h-4 inline mr-1" />
                    {event.watchlistCount} watching
                  </span>
                  {event.watchUrl && (
                    <a
                      href={event.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                    >
                      Watch Live
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
