import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WatchlistItem, CryptoAsset } from "@/types/firebase";

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [assets, setAssets] = useState<CryptoAsset[]>([]);

  useEffect(() => {
    // Subscribe to watchlist changes
    const watchlistQuery = query(
      collection(db, "watchlist"),
      where("userId", "==", "current-user-id"), // Replace with actual user ID
    );

    const unsubscribe = onSnapshot(watchlistQuery, (snapshot) => {
      const items: WatchlistItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          userId: data.userId,
          assetId: data.assetId,
          addedAt: data.addedAt,
          notes: data.notes,
          priceAlert: data.priceAlert,
        });
      });
      setWatchlist(items);
    });

    return () => unsubscribe();
  }, []);

  const addToWatchlist = async (assetId: string) => {
    try {
      await addDoc(collection(db, "watchlist"), {
        userId: "current-user-id", // Replace with actual user ID
        assetId,
        addedAt: new Date(),
      });
    } catch (error) {
      console.error("Error adding to watchlist:", error);
    }
  };

  const removeFromWatchlist = async (watchlistItem: WatchlistItem) => {
    try {
      const watchlistRef = collection(db, "watchlist");
      const q = query(
        watchlistRef,
        where("userId", "==", watchlistItem.userId),
        where("assetId", "==", watchlistItem.assetId),
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc: QueryDocumentSnapshot) => {
        await deleteDoc(doc.ref);
      });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Watchlist</h2>
      <div className="space-y-4">
        {watchlist.map((item, index) => (
          <div
            key={`${item.userId}-${item.assetId}-${index}`}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <div>
              <h3 className="font-semibold">{item.assetId}</h3>
              {item.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {item.notes}
                </p>
              )}
            </div>
            <button
              onClick={() => removeFromWatchlist(item)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
