import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'song_metrics', timestamps: true })
export class SongMetric extends Document {
  @Prop({ required: true, index: true })
  songId: string;

  @Prop({ default: 0 })
  plays: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const SongMetricSchema = SchemaFactory.createForClass(SongMetric);
