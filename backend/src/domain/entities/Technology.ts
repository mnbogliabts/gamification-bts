export interface TechnologyProps {
  id: string;
  name: string;
  category: string;
  createdAt: Date;
}

export class Technology {
  private constructor(private props: TechnologyProps) {}

  static create(params: {
    id: string;
    name: string;
    category: string;
    createdAt?: Date;
  }): Technology {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Technology name is required');
    }
    if (!params.category || params.category.trim().length === 0) {
      throw new Error('Technology category is required');
    }

    return new Technology({
      id: params.id,
      name: params.name.trim(),
      category: params.category.trim(),
      createdAt: params.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get category(): string {
    return this.props.category;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      category: this.props.category,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
