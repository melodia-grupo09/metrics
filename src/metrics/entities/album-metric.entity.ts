import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'album_metrics', timestamps: true })
export class AlbumMetric extends Document {
  @Prop({ required: true, index: true })
  albumId: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AlbumMetricSchema = SchemaFactory.createForClass(AlbumMetric);
