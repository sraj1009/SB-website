"use client";

import React, {
    createContext,
    useContext,
    useReducer,
    useEffect,
    useCallback,
} from "react";
import type { CartItem, CartState } from "@/types";

// ─── Actions ───────────────────────────────────────────
type CartAction =
    | { type: "ADD_ITEM"; payload: CartItem }
    | { type: "REMOVE_ITEM"; payload: string }
    | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
    | { type: "CLEAR_CART" }
    | { type: "LOAD_CART"; payload: CartItem[] };

// ─── Reducer ───────────────────────────────────────────
function cartReducer(state: CartState, action: CartAction): CartState {
    let items: CartItem[];

    switch (action.type) {
        case "ADD_ITEM": {
            const existingIndex = state.items.findIndex(
                (i) => i.productId === action.payload.productId
            );
            if (existingIndex > -1) {
                items = [...state.items];
                const newQty = items[existingIndex].quantity + action.payload.quantity;
                items[existingIndex] = {
                    ...items[existingIndex],
                    quantity: Math.min(newQty, items[existingIndex].maxQuantity),
                };
            } else {
                items = [...state.items, action.payload];
            }
            break;
        }
        case "REMOVE_ITEM":
            items = state.items.filter((i) => i.productId !== action.payload);
            break;
        case "UPDATE_QUANTITY":
            items = state.items.map((i) =>
                i.productId === action.payload.productId
                    ? { ...i, quantity: Math.max(1, Math.min(action.payload.quantity, i.maxQuantity)) }
                    : i
            );
            break;
        case "CLEAR_CART":
            items = [];
            break;
        case "LOAD_CART":
            items = action.payload;
            break;
        default:
            return state;
    }

    return {
        items,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    };
}

// ─── Context ───────────────────────────────────────────
interface CartContextType extends CartState {
    addItem: (item: CartItem) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "singglebee_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(cartReducer, {
        items: [],
        totalItems: 0,
        totalPrice: 0,
    });

    // Load cart from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const items = JSON.parse(stored) as CartItem[];
                dispatch({ type: "LOAD_CART", payload: items });
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Persist cart to localStorage
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    }, [state.items]);

    const addItem = useCallback((item: CartItem) => {
        dispatch({ type: "ADD_ITEM", payload: item });
    }, []);

    const removeItem = useCallback((productId: string) => {
        dispatch({ type: "REMOVE_ITEM", payload: productId });
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
    }, []);

    const clearCart = useCallback(() => {
        dispatch({ type: "CLEAR_CART" });
    }, []);

    return (
        <CartContext.Provider
            value={{ ...state, addItem, removeItem, updateQuantity, clearCart }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
