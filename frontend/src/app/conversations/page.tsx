'use client';

import { DashboardLayout } from '@/components/layout';
import { ConversationArea } from '@/components/conversation';

export default function ConversationsPage() {
  return (
    <DashboardLayout>
      <ConversationArea />
    </DashboardLayout>
  );
}
