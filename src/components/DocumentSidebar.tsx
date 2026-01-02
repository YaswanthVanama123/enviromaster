import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendar,
  faFileAlt,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faTrash,
  faCalendarDay,
  faHourglassHalf,
  faCalendarCheck
} from '@fortawesome/free-solid-svg-icons';

interface StatusCount {
  label: string;
  count: number;
  color: string;
  icon: any;
}

interface AgreementTimeline {
  agreementId: string;
  agreementTitle: string;
  startDate: string;
  contractMonths: number;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  status: 'active' | 'expiring-soon' | 'expired';
}

interface DocumentSidebarProps {
  statusCounts?: StatusCount[];
  totalDocuments?: number;
  mode?: 'normal' | 'trash' | 'approval';
  onDateSelect?: (date: Date) => void;
  agreementTimelines?: AgreementTimeline[];
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  statusCounts = [],
  totalDocuments = 0,
  mode = 'normal',
  onDateSelect,
  agreementTimelines = []
}) => {
  // Calculate summary statistics
  const timelineStats = useMemo(() => {
    const active = agreementTimelines.filter(t => t.status === 'active').length;
    const expiringSoon = agreementTimelines.filter(t => t.status === 'expiring-soon').length;
    const expired = agreementTimelines.filter(t => t.status === 'expired').length;

    return { active, expiringSoon, expired };
  }, [agreementTimelines]);

  // Sort timelines by days remaining (ascending - expiring soon first)
  const sortedTimelines = useMemo(() => {
    return [...agreementTimelines].sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [agreementTimelines]);

  const getTimelineColor = (status: 'active' | 'expiring-soon' | 'expired') => {
    switch (status) {
      case 'active': return '#10b981';
      case 'expiring-soon': return '#f59e0b';
      case 'expired': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getTimelineIcon = (status: 'active' | 'expiring-soon' | 'expired') => {
    switch (status) {
      case 'active': return faCalendarCheck;
      case 'expiring-soon': return faHourglassHalf;
      case 'expired': return faExclamationCircle;
      default: return faCalendar;
    }
  };

  return (
    <div style={{
      width: '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'sticky',
      top: '20px',
      alignSelf: 'flex-start'
    }}>
      {/* Active Days Remaining Widget */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FontAwesomeIcon icon={faCalendarDay} style={{ color: '#3b82f6', fontSize: '18px' }} />
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Active Days Remaining
            </h3>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '12px 8px',
            background: '#f0fdf4',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#10b981',
              marginBottom: '4px'
            }}>
              {timelineStats.active}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#059669',
              fontWeight: '500'
            }}>
              Active
            </div>
          </div>

          <div style={{
            padding: '12px 8px',
            background: '#fef3c7',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #fde68a'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#f59e0b',
              marginBottom: '4px'
            }}>
              {timelineStats.expiringSoon}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#d97706',
              fontWeight: '500'
            }}>
              Expiring
            </div>
          </div>

          <div style={{
            padding: '12px 8px',
            background: '#fef2f2',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #fecaca'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#dc2626',
              marginBottom: '4px'
            }}>
              {timelineStats.expired}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#b91c1c',
              fontWeight: '500'
            }}>
              Expired
            </div>
          </div>
        </div>

        {/* Timeline List */}
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {sortedTimelines.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              No active agreements with contract dates
            </div>
          )}

          {sortedTimelines.map((timeline) => {
            const progressPercentage = Math.min(100, (timeline.daysElapsed / timeline.totalDays) * 100);

            return (
              <div
                key={timeline.agreementId}
                style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${getTimelineColor(timeline.status)}`,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
              >
                {/* Agreement Title */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  <FontAwesomeIcon
                    icon={getTimelineIcon(timeline.status)}
                    style={{
                      color: getTimelineColor(timeline.status),
                      fontSize: '12px'
                    }}
                  />
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#374151',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {timeline.agreementTitle}
                  </div>
                </div>

                {/* Days Remaining */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {timeline.contractMonths} month contract
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: getTimelineColor(timeline.status)
                  }}>
                    {timeline.daysRemaining > 0 ? `${timeline.daysRemaining}d left` : 'Expired'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercentage}%`,
                    background: getTimelineColor(timeline.status),
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Start Date */}
                <div style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  marginTop: '6px'
                }}>
                  Started: {new Date(timeline.startDate).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Summary Box */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <FontAwesomeIcon
            icon={mode === 'trash' ? faTrash : mode === 'approval' ? faCheckCircle : faFileAlt}
            style={{
              color: mode === 'trash' ? '#dc2626' : mode === 'approval' ? '#10b981' : '#3b82f6',
              fontSize: '18px'
            }}
          />
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            {mode === 'trash' ? 'Trash Status' : mode === 'approval' ? 'Approval Status' : 'Document Status'}
          </h3>
        </div>

        {/* Total Documents */}
        <div style={{
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#6b7280'
          }}>
            Total Documents
          </span>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#374151'
          }}>
            {totalDocuments}
          </span>
        </div>

        {/* Status Breakdown */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {statusCounts.map((status, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: '8px',
                borderLeft: `3px solid ${status.color}`,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FontAwesomeIcon
                  icon={status.icon}
                  style={{ color: status.color, fontSize: '14px' }}
                />
                <span style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {status.label}
                </span>
              </div>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: status.color
              }}>
                {status.count}
              </span>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {statusCounts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            No status information available
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSidebar;
