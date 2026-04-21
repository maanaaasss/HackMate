'use client'

import { useState } from 'react'

type StarRatingProps = {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
}

export default function StarRating({ value, onChange, disabled = false, label }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    setHoverValue(0)
  }

  const displayValue = hoverValue || value

  return (
    <div className="flex flex-col">
      {label && (
        <span className="text-sm font-medium text-gray-700 mb-2">{label}</span>
      )}
      <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            disabled={disabled}
            className={`focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 rounded ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'
            }`}
            aria-label={`Rate ${star} out of 5`}
          >
            <svg
              className={`w-8 h-8 ${
                star <= displayValue ? 'text-yellow-400' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-600">{value}/5</span>
        )}
      </div>
    </div>
  )
}
