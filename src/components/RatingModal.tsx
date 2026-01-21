
import React, { useState } from 'react';
import { UserRole, BookingDetails } from '../types';

interface RatingModalProps {
  booking: BookingDetails;
  userRole: UserRole;
  onSubmit: (stars: number, tags: string[], comment: string) => void;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ booking, userRole, onSubmit, onClose }) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const driverTags = [
    { text: "Punctual", icon: "🕐" },
    { text: "Clean Vehicle", icon: "🚗" },
    { text: "Friendly", icon: "😊" },
    { text: "Safe Driver", icon: "🛣️" },
    { text: "Good Communication", icon: "💬" }
  ];

  const passengerTags = [
    { text: "On Time", icon: "🕐" },
    { text: "Polite", icon: "😊" },
    { text: "Payment Smooth", icon: "💳" },
    { text: "Clear Directions", icon: "📍" }
  ];

  const toggleTag = (tagText: string) => {
    setSelectedTags(prev =>
      prev.includes(tagText) ? prev.filter(t => t !== tagText) : [...prev, tagText]
    );
  };

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl w-full h-full cursor-default"
        onClick={onClose}
        aria-label="Close rating modal"
      />

      <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

        <div className="text-center space-y-4 mb-10">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Rate your {userRole === UserRole.USER ? 'Driver' : 'Passenger'}
          </p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            How was the trip?
          </h2>
          {booking.fareAmount && (
            <div className="bg-green-50 rounded-2xl p-4 inline-block border border-green-100 mt-2">
              <p className="text-[10px] font-black uppercase text-green-600 mb-1">Final Fare</p>
              <p className="text-3xl font-black text-slate-900 leading-none">₹{booking.fareAmount.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Star Selection */}
        <div className="flex justify-center space-x-3 mb-10">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-5xl transition-all hover:scale-125 active:scale-90 ${star <= rating ? 'text-yellow-400 drop-shadow-lg' : 'text-slate-100'
                }`}
              aria-label={`${star} Stars`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Tag Selection */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {(userRole === UserRole.USER ? driverTags : passengerTags).map(tag => (
            <button
              key={tag.text}
              onClick={() => toggleTag(tag.text)}
              className={`p-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border-2 ${selectedTags.includes(tag.text)
                ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-lg'
                : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200'
                }`}
            >
              <span role="img" aria-label={tag.text} className="mr-2">{tag.icon}</span>
              {tag.text}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            placeholder="Any specific feedback? (Optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-6 rounded-[2rem] bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner min-h-[100px] outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
            aria-label="Feedback comment"
          />

          <button
            onClick={() => onSubmit(rating, selectedTags, comment)}
            className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all mt-4"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
