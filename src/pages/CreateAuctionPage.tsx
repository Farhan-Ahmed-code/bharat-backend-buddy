import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category { id: string; name: string }

const IMAGE_BUCKET = 'auction-images'; // Ensure this bucket exists and allows public read

const CreateAuctionPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [endTime, setEndTime] = useState(''); // local datetime string
  const [imageUrl, setImageUrl] = useState(''); // optional direct URL
  const [imageFile, setImageFile] = useState<File | null>(null); // optional upload
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const previewSrc = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (imageUrl && /^https?:\/\//i.test(imageUrl)) return imageUrl.trim();
    return '';
  }, [imageFile, imageUrl]);

  useEffect(() => {
    return () => {
      if (imageFile) URL.revokeObjectURL(previewSrc);
    };
  }, [imageFile, previewSrc]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('id,name').order('name');
        if (error) {
          console.error('Error loading categories:', error);
          toast({ title: 'Error', description: 'Failed to load categories.' });
        } else if (data) {
          setCategories(data as Category[]);
        }
      } catch (err) {
        console.error('Unexpected error loading categories:', err);
      }
    };
    loadCategories();
  }, []);

  const endTimeValid = useMemo(() => {
    if (!endTime) return false;
    const dt = new Date(endTime);
    return dt.getTime() > Date.now() + 60_000; // must be > 1 min in future
  }, [endTime]);

  const canSubmit = useMemo(() => {
    const price = parseFloat(startingPrice);
    const titleOk = title.trim().length >= 3;
    const priceOk = !Number.isNaN(price) && price > 0;
    const endOk = endTimeValid;
    // If file selected, basic validations
    const imageOk = imageFile ? imageFile.size <= 5 * 1024 * 1024 : true; // <= 5MB
    return titleOk && priceOk && endOk && imageOk;
  }, [title, startingPrice, endTimeValid, imageFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast({ title: 'Please fix form errors', description: 'Ensure title, price, and end time are valid.' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Not authenticated', description: 'Please sign in to create an auction.' });
        navigate('/auth');
        return;
      }

      // Prepare image URL (uploaded or manual URL)
      let finalImageUrl: string | null = imageUrl ? imageUrl.trim() : null;
      if (imageFile) {
        try {
          const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = `${user.id}/${Date.now()}.${ext}`;
          console.log('Uploading image to:', filePath);
          const { error: uploadError } = await supabase
            .storage
            .from(IMAGE_BUCKET)
            .upload(filePath, imageFile, { cacheControl: '3600', upsert: false, contentType: imageFile.type });
          if (uploadError) {
            console.error('Upload error:', uploadError);
            console.log('Upload error details:', uploadError);
            // Don't fail the auction creation if image upload fails
            toast({ title: 'Image Upload Failed', description: 'Auction created without image. You can add an image URL manually.' });
          } else {
            const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
            finalImageUrl = publicUrlData.publicUrl;
            console.log('Image uploaded successfully:', finalImageUrl);
          }
        } catch (imageError: any) {
          console.error('Image processing error:', imageError);
          console.log('Image error details:', imageError);
          // Don't fail the auction creation if image upload fails
          toast({ title: 'Image Upload Failed', description: 'Auction created without image. You can add an image URL manually.' });
        }
      }

      const parsedPrice = parseFloat(startingPrice);
      const isoEndTime = new Date(endTime).toISOString();

      console.log('Creating auction with data:', {
        title: title.trim(),
        description: description.trim() || null,
        starting_price: parsedPrice,
        current_price: parsedPrice,
        start_time: new Date().toISOString(),
        end_time: isoEndTime,
        image_url: finalImageUrl,
        seller_id: user.id,
        status: 'active', // Temporarily active
        // approval_status: 'approved', // Commented out
        category_id: categoryId || null,
      });

      const newAuction: TablesInsert<'auctions'> = {
        title: title.trim(),
        description: description.trim() || null,
        starting_price: parsedPrice,
        current_price: parsedPrice,
        start_time: new Date().toISOString(), // Add start time as current time
        end_time: isoEndTime,
        image_url: finalImageUrl,
        seller_id: user.id,
        status: 'active', // Temporarily set to active until migration is applied
        // approval_status: 'approved', // Commented out until migration is applied
        category_id: categoryId || null,
      };

      console.log('Inserting auction into database...');
      const { data, error } = await supabase
        .from('auctions')
        .insert(newAuction)
        .select('id')
        .single();

      if (error) {
        console.error('Database insertion error:', error);
        console.log('Error details:', error);
        throw error;
      }

      console.log('Auction created successfully with ID:', data!.id);

      toast({ title: 'Auction created successfully', description: 'Your auction is now live and active!' });
      navigate(`/auction/${data!.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to create auction', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Auction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vintage camera" required />
                {title.trim().length > 0 && title.trim().length < 3 && (
                  <p className="text-xs text-red-500">Title should be at least 3 characters.</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item..." />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Starting Price */}
              <div className="space-y-2">
                <Label htmlFor="starting_price">Starting Price</Label>
                <Input id="starting_price" type="number" step="0.01" min="0" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="1000" required />
                {startingPrice && (Number.isNaN(parseFloat(startingPrice)) || parseFloat(startingPrice) <= 0) && (
                  <p className="text-xs text-red-500">Enter a valid positive amount.</p>
                )}
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input id="end_time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                {endTime && !endTimeValid && (
                  <p className="text-xs text-red-500">End time must be at least 1 minute in the future.</p>
                )}
              </div>

              {/* Image URL or Upload */}
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                {imageUrl && !/^https?:\/\//i.test(imageUrl) && (
                  <p className="text-xs text-red-500">Please enter a valid http(s) URL.</p>
                )}
                <div className="text-xs text-muted-foreground">Or upload an image (max 5MB)</div>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {imageFile && imageFile.size > 5 * 1024 * 1024 && (
                  <p className="text-xs text-red-500">File is too large. Max size is 5MB.</p>
                )}
                {previewSrc && (
                  <div className="pt-2">
                    <img
                      src={previewSrc}
                      alt="Preview"
                      className="h-40 w-full object-cover rounded-md border"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={loading || !canSubmit}>
                {loading ? 'Creating…' : 'Create Auction'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAuctionPage;