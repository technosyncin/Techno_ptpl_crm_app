import React from 'react';
import { Lead } from '../../api/leadService';
import { CommonListCard } from './CommonListCard';
import { Colors } from '../../theme/colors';
import { formatDate } from '../../utils/formatting';

interface LeadCardProps {
  lead: Lead;
  onPress: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onQuickMessage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onPress,
  onEdit,
  onDelete,
}) => {
  const nextFollowUp = lead.nextFollowUpDate || lead.followUpDate;
  const nextTime = lead.followUpTime;
const leadSourceDisplay = lead.leadSourceName || 'Direct';
const productDisplay = lead.productInterestedIn ? lead.productInterestedIn.trim() : null;

  return (
    <CommonListCard
      title={lead.leadName}
      subtitle={lead.companyName || undefined}
      badgeLabel={String(lead.leadStatus || 'Active')}
      badgeVariant="primary"
      pills={[
        productDisplay
          ? {
              icon: 'cube-outline',
              text: `Product: ${productDisplay}`,
              iconColor: Colors.primary,
            }
          : {
              icon: 'cube-outline',
              text: 'Product: General',
              iconColor: Colors.slate400,
            },
        {
          icon: 'funnel-outline',
          text: `Source: ${leadSourceDisplay}`,
          iconColor: '#0284c7',
        },
        lead.city
          ? {
              icon: 'location-outline',
              text: lead.city,
              iconColor: Colors.slate500,
            }
          : null,
      ]}
      metaLeft={{
        label: 'Mobile No',
        value: lead.mobileNo || 'N/A',
        valueColor: Colors.slate900,
      }}
      metaRight={{
        label: 'Next Follow-up',
        badgeText: nextFollowUp
          ? `${formatDate(nextFollowUp)}${nextTime ? ` • ${nextTime}` : ''}`
          : 'Not Scheduled',
        badgeIcon: 'calendar-outline',
        badgeColor: nextFollowUp ? '#b45309' : Colors.slate500,
        badgeBgColor: nextFollowUp ? '#fef3c7' : '#f1f5f9',
      }}
      onPress={onPress}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};
