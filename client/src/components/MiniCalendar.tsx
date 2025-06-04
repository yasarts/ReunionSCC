import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
  description?: string;
  duration?: number;
  pouvoir?: string;
  agendaItemsCount?: number;
  totalDuration?: number;
  createdAt?: string;
}

interface MiniCalendarProps {
  meetings?: Meeting[];
  onMeetingSelect?: (meeting: Meeting) => void;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export function MiniCalendar({ 
  meetings = [], 
  onMeetingSelect, 
  onDateSelect,
  selectedDate 
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [previewMeeting, setPreviewMeeting] = useState<Meeting | null>(null);

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Obtenir le premier jour du mois et le nombre de jours
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Générer les jours du calendrier
  const calendarDays = [];
  
  // Jours du mois précédent pour compléter la première semaine
  const daysFromPrevMonth = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;
  const prevMonth = new Date(currentYear, currentMonth - 1, 0);
  for (let i = daysFromPrevMonth; i > 0; i--) {
    const day = prevMonth.getDate() - i + 1;
    calendarDays.push({
      day,
      date: new Date(currentYear, currentMonth - 1, day),
      isCurrentMonth: false,
      isToday: false
    });
  }

  // Jours du mois actuel
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const isToday = date.toDateString() === today.toDateString();
    calendarDays.push({
      day,
      date,
      isCurrentMonth: true,
      isToday
    });
  }

  // Jours du mois suivant pour compléter la dernière semaine
  const remainingDays = 42 - calendarDays.length; // 6 semaines * 7 jours
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      date: new Date(currentYear, currentMonth + 1, day),
      isCurrentMonth: false,
      isToday: false
    });
  }

  // Obtenir les réunions pour une date donnée
  const getMeetingsForDate = (date: Date): Meeting[] => {
    const dateString = date.toISOString().split('T')[0];
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date).toISOString().split('T')[0];
      return meetingDate === dateString;
    });
  };

  // Navigation du calendrier
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentYear, currentMonth + (direction === 'next' ? 1 : -1), 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Formatage des dates
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:MM
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-200 text-gray-700';
      case 'scheduled': return 'bg-blue-200 text-blue-700';
      case 'in_progress': return 'bg-green-200 text-green-700';
      case 'completed': return 'bg-green-300 text-green-800';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date);
    const dateMeetings = getMeetingsForDate(date);
    if (dateMeetings.length === 1) {
      setPreviewMeeting(dateMeetings[0]);
    }
  };

  const handleDateHover = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setHoveredDate(dateString);
    const dateMeetings = getMeetingsForDate(date);
    if (dateMeetings.length > 0) {
      setPreviewMeeting(dateMeetings[0]);
    } else {
      setPreviewMeeting(null);
    }
  };

  const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-lg font-semibold capitalize">
              {formatMonthYear(currentDate)}
            </CardTitle>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="w-full text-xs"
          >
            Aujourd'hui
          </Button>
        </CardHeader>

        <CardContent className="p-3">
          {/* En-têtes des jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day, index) => (
              <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((calendarDay, index) => {
              const dayMeetings = getMeetingsForDate(calendarDay.date);
              const isSelected = selectedDate && 
                calendarDay.date.toDateString() === selectedDate.toDateString();
              const isHovered = hoveredDate === calendarDay.date.toISOString().split('T')[0];

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(calendarDay.date)}
                  onMouseEnter={() => handleDateHover(calendarDay.date)}
                  onMouseLeave={() => {
                    setHoveredDate(null);
                    setPreviewMeeting(null);
                  }}
                  className={`
                    relative h-8 w-8 text-xs rounded transition-colors
                    ${calendarDay.isCurrentMonth 
                      ? 'text-gray-900 hover:bg-blue-50' 
                      : 'text-gray-400 hover:bg-gray-50'
                    }
                    ${calendarDay.isToday 
                      ? 'bg-blue-100 font-semibold text-blue-700' 
                      : ''
                    }
                    ${isSelected 
                      ? 'bg-blue-500 text-white' 
                      : ''
                    }
                    ${isHovered && !isSelected 
                      ? 'bg-blue-100' 
                      : ''
                    }
                  `}
                >
                  {calendarDay.day}
                  {dayMeetings.length > 0 && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-blue-500">
                      {dayMeetings.length > 1 && (
                        <span className="absolute -top-1 -right-1 text-xs font-bold text-blue-700">
                          {dayMeetings.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Prévisualisation de réunion */}
          {previewMeeting && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                  {previewMeeting.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getStatusColor(previewMeeting.status)}`}
                >
                  {previewMeeting.status}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  {formatTime(previewMeeting.time)}
                  {previewMeeting.duration && ` (${previewMeeting.duration}min)`}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Users className="w-3 h-3" />
                  {previewMeeting.participants.length} participant{previewMeeting.participants.length > 1 ? 's' : ''}
                </div>
              </div>

              {previewMeeting.description && (
                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                  {previewMeeting.description}
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMeetingSelect?.(previewMeeting)}
                  className="flex-1 text-xs h-7"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir
                </Button>
              </div>
            </div>
          )}

          {/* Légende */}
          <div className="mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Réunion programmée</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}