import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFirstViewTooltip, resetFirstViewTooltip, updateFirstViewTooltip, UpdateFirstViewTooltipData } from "./actions";

export const useGetFirstViewTooltip = (userId: string) => {
    return useQuery({
        queryFn: () => {
            return getFirstViewTooltip(userId);
        },
        queryKey: ["firstViewTooltip"],
        enabled: !!userId,
    });
};

export const useUpdateFirstViewTooltip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateFirstViewTooltipData) => {
            return updateFirstViewTooltip(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["firstViewTooltip"]
            })
        },
    });
};

export const useResetFirstViewTooltip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => {
            return resetFirstViewTooltip(userId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["firstViewTooltip"]
            })
        },
    });
};
