import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'artist_metrics',
  timestamps: true,
  suppressReservedKeysWarning: true,
})
export class ArtistMetric extends Document {
  @Prop({ required: true, index: true })
  artistId: string;

  @Prop({ type: [{ userId: String, timestamp: Date }], default: [] })
  listeners: Array<{ userId: string; timestamp: Date }>;

  @Prop({ type: [{ userId: String, timestamp: Date }], default: [] })
  followers: Array<{ userId: string; timestamp: Date }>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ArtistMetricSchema = SchemaFactory.createForClass(ArtistMetric);

ArtistMetricSchema.index({ 'listeners.timestamp': 1 });
