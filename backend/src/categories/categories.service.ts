import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

// FEAT-02: Default category definitions
const DEFAULT_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, gadgets and tech' },
  { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, bags and accessories' },
  {
    name: 'Collectibles',
    slug: 'collectibles',
    description: 'Rare items, memorabilia, trading cards',
  },
  { name: 'Art', slug: 'art', description: 'Paintings, sculptures, prints and photography' },
  {
    name: 'Jewelry & Watches',
    slug: 'jewelry-watches',
    description: 'Fine jewelry, gemstones and luxury watches',
  },
  { name: 'Vehicles', slug: 'vehicles', description: 'Cars, motorcycles, boats and parts' },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Furniture, decor, tools and outdoor',
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Equipment, gear and apparel',
  },
  {
    name: 'Toys & Games',
    slug: 'toys-games',
    description: 'Action figures, board games, video games',
  },
  { name: 'Books & Media', slug: 'books-media', description: 'Books, music, movies and games' },
  {
    name: 'Antiques',
    slug: 'antiques',
    description: 'Vintage and antique items over 100 years old',
  },
  { name: 'Other', slug: 'other', description: 'Miscellaneous items' },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoriesRepository.findOne({
      where: [{ name: dto.name }, { slug: dto.slug }],
    });

    if (existing) {
      throw new ConflictException('Category with this name or slug already exists');
    }

    const category = this.categoriesRepository.create(dto);
    return this.categoriesRepository.save(category);
  }

  // FEAT-02: Idempotent seed — safe to call on every startup
  async seedDefaultCategories(): Promise<void> {
    await this.categoriesRepository.upsert(DEFAULT_CATEGORIES, {
      conflictPaths: ['slug'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
