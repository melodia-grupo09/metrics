import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'user_likes', timestamps: true })
export class UserLike extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  entityId: string; // songId or albumId

  @Prop({ required: true, enum: ['song', 'album'] })
  entityType: string;

  @Prop({ required: true, index: true })
  artistId: string;

  @Prop({ index: true })
  region: string;

  @Prop({ required: true, index: true })
  timestamp: Date;
}

export const UserLikeSchema = SchemaFactory.createForClass(UserLike);

UserLikeSchema.index(
  { userId: 1, entityId: 1, entityType: 1 },
  { unique: true },
);
