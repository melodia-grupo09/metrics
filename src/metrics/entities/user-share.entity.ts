import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'user_shares', timestamps: true })
export class UserShare extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  entityId: string; // songId or albumId

  @Prop({ required: true, enum: ['song', 'album'] })
  entityType: string;

  @Prop({ required: true, index: true })
  artistId: string;

  @Prop({ required: true, index: true })
  timestamp: Date;
}

export const UserShareSchema = SchemaFactory.createForClass(UserShare);
