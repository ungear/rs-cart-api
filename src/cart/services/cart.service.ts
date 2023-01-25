import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import {Cart} from '../models';
import {Client} from 'pg';

const pgDbOptions = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

@Injectable()
export class CartService {
  private userCarts: Record<string, Cart> = {};

  async findByUserId(userId: string): Promise<Cart> {
    const client = new Client(pgDbOptions);
    await client.connect();

    try{
      const result = await client.query(`
        select * from carts as c
        left join cart_items as ci on c.id = ci.cart_id
        where c.user_id = '${userId}';
      `);
      const cartItems = result.rows;
      const cart: Cart = {
        id: cartItems[0].id,
        items: cartItems.map(x => ({
          product: {
            id: x.product_id,
            title: 'not implemented',
            description: 'not implemented',
            price: 0,
          },
          count: x.count,
        }))
      }
      return cart;
    } catch (error){
      console.error('Error when trying to get data');
      console.error(error);
    } finally {
      client.end();
    }
  }

  createByUserId(userId: string) {
    const id = v4(v4());
    const userCart = {
      id,
      items: [],
    };

    this.userCarts[ userId ] = userCart;

    return userCart;
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, cart: Cart): Promise<Cart> {
    const client = new Client(pgDbOptions);
    await client.connect();
    try {
      for await (const cartItem of cart.items){
        await client.query(`
          update cart_items
          set count=${cartItem.count}
          where product_id = '${cartItem.product.id}'
          and cart_id = '${cart.id}';
        `)
      }
      return cart;
    } catch (error){
      console.error('Error when trying to get data');
      console.error(error);
    } finally {
      client.end();
    }
  }

  removeByUserId(userId): void {
    this.userCarts[ userId ] = null;
  }

}
