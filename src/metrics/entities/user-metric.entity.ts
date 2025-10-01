import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserEventType {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  ACTIVITY = 'activity',
}

@Schema({ collection: 'user_events', timestamps: true })
export class UserMetric extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: UserEventType, index: true })
  eventType: UserEventType;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const UserMetricSchema = SchemaFactory.createForClass(UserMetric);

// Create compound indexes
UserMetricSchema.index({ userId: 1, eventType: 1, timestamp: 1 });
UserMetricSchema.index({ eventType: 1, timestamp: 1 });
