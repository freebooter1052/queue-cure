import type { Metadata } from 'next';
import WaitingRoomDisplay from '@/components/display/WaitingRoomDisplay';

export const metadata: Metadata = {
  title: 'Patient Waiting Room | CareQueue',
  description:
    'Real-time queue display for patients. See your estimated wait time and queue position.',
};

export default function DisplayPage() {
  return <WaitingRoomDisplay />;
}
