import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'user_plays', timestamps: true })
export class UserPlay extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  songId: string;

  @Prop({ required: true, index: true })
  artistId: string;

  @Prop({ index: true })
  region: string;

  @Prop({ required: true, index: true })
  timestamp: Date;
}

export const UserPlaySchema = SchemaFactory.createForClass(UserPlay);

// Create compound indexes for efficient queries
UserPlaySchema.index({ userId: 1, timestamp: 1 });
UserPlaySchema.index({ userId: 1, songId: 1 });
UserPlaySchema.index({ userId: 1, artistId: 1 });
