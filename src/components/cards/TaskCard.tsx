import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '../../api/taskService';
import { Badge } from '../common/Badge';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { formatDate } from '../../utils/formatting';

interface TaskCardProps {
  task: TaskItem;
  onToggleStatus: () => void;
  onDelete?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleStatus, onDelete }) => {
  const isCompleted = task.status === 'Completed';

  return (
    <View style={[styles.card, Shadows.sm, isCompleted && styles.cardCompleted]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onToggleStatus}
          style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
          activeOpacity={0.7}
        >
          {isCompleted && <Ionicons name="checkmark" size={16} color="#ffffff" />}
        </TouchableOpacity>

        <View style={styles.contentCol}>
          <Text
            style={[
              Typography.bodyBold,
              styles.title,
              isCompleted && styles.titleCompleted,
            ]}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text style={[Typography.caption, styles.description]} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {task.dueDate ? (
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={12} color={Colors.slate500} />
                <Text style={[Typography.caption, styles.dateText]}>
                  {formatDate(task.dueDate)}
                </Text>
              </View>
            ) : null}

            {task.category ? (
              <View style={styles.categoryBadge}>
                <Text style={[Typography.captionMedium, styles.categoryText]}>
                  {task.category}
                </Text>
              </View>
            ) : null}

            <Badge label={task.priority || 'Medium'} size="sm" />
          </View>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.slate400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: {
    backgroundColor: '#fafafa',
    borderColor: Colors.slate200,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.slate300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  contentCol: {
    flex: 1,
  },
  title: {
    color: Colors.slate900,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.slate400,
  },
  description: {
    color: Colors.slate600,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  dateText: {
    color: Colors.slate600,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  categoryBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  categoryText: {
    color: Colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  deleteBtn: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
});
